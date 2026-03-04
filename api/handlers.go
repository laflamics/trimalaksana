package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/google/uuid"
	"context"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Response wrapper
type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Storage data structure
type StorageData struct {
	Key       string      `json:"key"`
	Value     interface{} `json:"value"`
	Timestamp int64       `json:"timestamp"`
}

// File metadata
type FileMetadata struct {
	FileID    string `json:"fileId"`
	FileName  string `json:"fileName"`
	FileSize  int64  `json:"fileSize"`
	MimeType  string `json:"mimeType"`
	Module    string `json:"module"`
	UploadedAt string `json:"uploadedAt"`
}

// ============================================
// STORAGE HANDLERS
// ============================================

// GET /api/storage/{key}
func (s *Server) getStorageData(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	key := vars["key"]

	w.Header().Set("Content-Type", "application/json")

	// Query from PostgreSQL
	var value interface{}
	var timestamp int64
	err := s.db.QueryRow(
		"SELECT value, EXTRACT(EPOCH FROM updated_at)::bigint FROM storage_data WHERE key = $1 AND deleted_at IS NULL",
		key,
	).Scan(&value, &timestamp)

	if err != nil {
		// Key not found, return empty array
		data := map[string]interface{}{
			"key":       key,
			"value":     []interface{}{},
			"timestamp": time.Now().Unix(),
		}
		json.NewEncoder(w).Encode(Response{
			Success: true,
			Data:    data,
		})
		return
	}

	data := map[string]interface{}{
		"key":       key,
		"value":     value,
		"timestamp": timestamp,
	}

	json.NewEncoder(w).Encode(Response{
		Success: true,
		Data:    data,
	})
}

// POST /api/storage/{key}
func (s *Server) setStorageData(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	key := vars["key"]

	var payload struct {
		Value interface{} `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Error:   fmt.Sprintf("Invalid request body: %v", err),
		})
		return
	}

	// Convert value to JSON
	valueJSON, err := json.Marshal(payload.Value)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Error:   fmt.Sprintf("Failed to marshal value: %v", err),
		})
		return
	}

	// Upsert to PostgreSQL
	_, err = s.db.Exec(
		`INSERT INTO storage_data (key, value, updated_at, deleted_at) 
		 VALUES ($1, $2, CURRENT_TIMESTAMP, NULL)
		 ON CONFLICT (key) DO UPDATE SET 
		 value = $2, updated_at = CURRENT_TIMESTAMP, deleted_at = NULL`,
		key, valueJSON,
	)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Error:   fmt.Sprintf("Failed to save data: %v", err),
		})
		return
	}

	log.Printf("✅ Saved data for key: %s", key)

	// Broadcast to WebSocket clients
	s.hub.broadcast <- map[string]interface{}{
		"type":      "sync",
		"key":       key,
		"value":     payload.Value,
		"timestamp": time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{
		Success: true,
		Data: map[string]interface{}{
			"key":       key,
			"timestamp": time.Now().Unix(),
		},
	})
}

// DELETE /api/storage/{key}
func (s *Server) deleteStorageData(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	key := vars["key"]

	// Soft delete - mark as deleted
	_, err := s.db.Exec(
		"UPDATE storage_data SET deleted_at = CURRENT_TIMESTAMP WHERE key = $1",
		key,
	)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Error:   fmt.Sprintf("Failed to delete data: %v", err),
		})
		return
	}

	log.Printf("✅ Deleted data for key: %s", key)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{
		Success: true,
		Data: map[string]interface{}{
			"key": key,
		},
	})
}

// GET /api/storage - List all storage keys with counts
func (s *Server) listStorageData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := s.db.Query(
		`SELECT key, jsonb_array_length(value) as count, updated_at 
		 FROM storage_data 
		 WHERE deleted_at IS NULL 
		 ORDER BY updated_at DESC`,
	)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Error:   fmt.Sprintf("Failed to list storage: %v", err),
		})
		return
	}
	defer rows.Close()

	var items []map[string]interface{}
	for rows.Next() {
		var key string
		var count int
		var updatedAt time.Time

		if err := rows.Scan(&key, &count, &updatedAt); err != nil {
			continue
		}

		items = append(items, map[string]interface{}{
			"key":       key,
			"count":     count,
			"updatedAt": updatedAt,
		})
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{
		Success: true,
		Data: map[string]interface{}{
			"items": items,
			"total": len(items),
		},
	})
}

// ============================================
// FILE HANDLERS
// ============================================

// POST /api/upload
func (s *Server) uploadFile(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	if err := r.ParseMultipartForm(100 << 20); err != nil { // 100MB max
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Error:   fmt.Sprintf("Failed to parse form: %v", err),
		})
		return
	}

	file, handler, err := r.FormFile("file")
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Error:   fmt.Sprintf("Failed to get file: %v", err),
		})
		return
	}
	defer file.Close()

	module := r.FormValue("module")
	if module == "" {
		module = "general"
	}

	// Generate file ID
	fileID := uuid.New().String()
	objectKey := filepath.Join(module, fileID, handler.Filename)

	// Upload to MinIO
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	info, err := s.minio.PutObject(ctx, "trimalaksana-files", objectKey, file, handler.Size, minio.PutObjectOptions{
		ContentType: handler.Header.Get("Content-Type"),
	})
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Error:   fmt.Sprintf("Failed to upload file: %v", err),
		})
		return
	}

	// TODO: Save metadata to PostgreSQL

	metadata := FileMetadata{
		FileID:     fileID,
		FileName:   handler.Filename,
		FileSize:   info.Size,
		MimeType:   handler.Header.Get("Content-Type"),
		Module:     module,
		UploadedAt: time.Now().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{
		Success: true,
		Data:    metadata,
	})
}

// GET /api/download/{fileId}
func (s *Server) downloadFile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	fileID := vars["fileId"]

	// TODO: Get metadata from PostgreSQL to find objectKey

	// For now, construct object key (in production, query from DB)
	objectKey := filepath.Join("general", fileID, "file.pdf")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	object, err := s.minio.GetObject(ctx, "trimalaksana-files", objectKey, minio.GetObjectOptions{})
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Error:   fmt.Sprintf("File not found: %v", err),
		})
		return
	}
	defer object.Close()

	// Get object info
	objInfo, err := object.Stat()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Error:   fmt.Sprintf("Failed to get file info: %v", err),
		})
		return
	}

	// Set response headers
	w.Header().Set("Content-Type", objInfo.ContentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", objInfo.Size))
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filepath.Base(objectKey)))

	// Stream file
	if _, err := io.Copy(w, object); err != nil {
		log.Printf("Error streaming file: %v", err)
	}
}

// ============================================
// WEBSOCKET HANDLER
// ============================================

// GET /ws
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:  s.hub,
		conn: conn,
		send: make(chan interface{}, 256),
	}

	s.hub.register <- client

	go client.writePump()
	go client.readPump()
}
