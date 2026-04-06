# Packaging Delivery Note - SJ Recap Summary Visual Guide

---

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Delivery Note (Surat Jalan)                                    │
│  [+ Create Delivery Note]                                       │
├─────────────────────────────────────────────────────────────────┤
│  [Delivery Note] [Outstanding] [Schedule] [Recap] ← Active Tab  │
├─────────────────────────────────────────────────────────────────┤
│  Search... [+ Create SJ Recap] [Card View] [Table View]         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 📊 SJ Recap Summary                                      │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ Total SJ     │  │ Total SJ     │  │ Total Items  │   │   │
│  │  │ Recap        │  │ Merged       │  │              │   │   │
│  │  │              │  │              │  │              │   │   │
│  │  │      5       │  │      12      │  │      48      │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │                                                          │   │
│  │  ┌──────────────┐                                        │   │
│  │  │ Total Qty    │                                        │   │
│  │  │              │                                        │   │
│  │  │   250 PCS    │                                        │   │
│  │  └──────────────┘                                        │   │
│  │                                                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ 📋 Merged SJ Details                                     │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ SJ-2026-001                        [5 SJ merged]   │  │   │
│  │  │ SO: SO-001, SO-002                                │  │   │
│  │  │                                                    │  │   │
│  │  │ Merged SJ Numbers:                                │  │   │
│  │  │ [SJ-2026-0001] [SJ-2026-0002] [SJ-2026-0003]     │  │   │
│  │  │ [SJ-2026-0004] [SJ-2026-0005]                    │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ SJ-2026-002                        [7 SJ merged]   │  │   │
│  │  │ SO: SO-003                                        │  │   │
│  │  │                                                    │  │   │
│  │  │ Merged SJ Numbers:                                │  │   │
│  │  │ [SJ-2026-0006] [SJ-2026-0007] [SJ-2026-0008]     │  │   │
│  │  │ [SJ-2026-0009] [SJ-2026-0010] [SJ-2026-0011]     │  │   │
│  │  │ [SJ-2026-0012]                                    │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ SO-001 | Customer A | 2 SJ | 50 PCS | Last: 2026-03-06 │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ SJ-2026-001                              [CLOSE]   │  │   │
│  │  │ SO 001                                             │  │   │
│  │  │ Items: Product A - 25 PCS, Product B - 25 PCS    │  │   │
│  │  │ Driver: John Doe | Kendaraan: B-1234-XYZ         │  │   │
│  │  │ Delivery Date: 2026-03-06                         │  │   │
│  │  │ [👁️ View] [✏️ Edit] [🖨️ Print] [📄 View Doc]     │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ SJ-2026-002 (Recap)                    [CLOSE]     │  │   │
│  │  │ SO 001, 002                                        │  │   │
│  │  │ Items: 5 items merged from 7 SJs                  │  │   │
│  │  │ Driver: Jane Smith | Kendaraan: B-5678-ABC        │  │   │
│  │  │ Delivery Date: 2026-03-06                         │  │   │
│  │  │ [👁️ View] [✏️ Edit] [🖨️ Print] [📄 View Doc]     │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary Metrics Explanation

### 1. Total SJ Recap (Purple)
**What it shows**: Number of SJ Recap records created

**Example**: 5 means there are 5 separate recap SJs

**Use case**: Quick count of how many recaps have been created

---

### 2. Total SJ Merged (Green)
**What it shows**: Total number of individual SJs that were merged into recaps

**Example**: 12 means 12 individual SJs were consolidated into the 5 recaps

**Use case**: Understand consolidation ratio (12 SJs → 5 Recaps)

---

### 3. Total Items (Blue)
**What it shows**: Total number of items across all recap SJs

**Example**: 48 items total across all recaps

**Use case**: Understand data volume and complexity

---

### 4. Total Quantity (Orange)
**What it shows**: Total quantity in PCS across all items

**Example**: 250 PCS total

**Use case**: Quick overview of total shipment volume

---

## Merged SJ Details Section

### Card Structure

```
┌─────────────────────────────────────────────────────┐
│ SJ-2026-001                        [5 SJ merged]    │
│ SO: SO-001, SO-002                                  │
│                                                     │
│ Merged SJ Numbers:                                  │
│ [SJ-2026-0001] [SJ-2026-0002] [SJ-2026-0003]       │
│ [SJ-2026-0004] [SJ-2026-0005]                      │
└─────────────────────────────────────────────────────┘
```

### Information Displayed

1. **SJ Recap Number** (Top Left)
   - The recap SJ number (e.g., SJ-2026-001)
   - Identifies the recap record

2. **Merged Count Badge** (Top Right)
   - Shows how many SJs were merged
   - Purple badge with count

3. **SO Numbers** (Second Line)
   - Associated Sales Order numbers
   - Helps trace back to original orders

4. **Merged SJ Numbers** (Bottom)
   - List of all individual SJ numbers
   - Each displayed as a purple tag
   - Easy to reference and track

---

## Color Coding

### Summary Metrics
| Metric | Color | Hex | Meaning |
|--------|-------|-----|---------|
| SJ Recap | Purple | #9C27B0 | Recap records |
| SJ Merged | Green | #4CAF50 | Consolidated SJs |
| Items | Blue | #2196F3 | Item count |
| Quantity | Orange | #FF9800 | Volume |

### Recap Details
| Element | Color | Meaning |
|---------|-------|---------|
| Section Header | Purple | Recap-related |
| SJ Number | Purple | Recap identifier |
| Merged Count Badge | Purple | Recap metric |
| SJ Tags | Light Purple | Individual SJs |

---

## Responsive Design

### Desktop (1200px+)
- 4 metric cards in a row
- Full details visible
- Optimal spacing

### Tablet (768px - 1199px)
- 2 metric cards per row
- Details cards full width
- Adjusted spacing

### Mobile (< 768px)
- 1 metric card per row
- Stacked layout
- Touch-friendly spacing

---

## Interaction Flow

### 1. View Summary
```
User opens Recap tab
    ↓
Summary section loads automatically
    ↓
User sees key metrics at a glance
```

### 2. Explore Details
```
User scrolls down to "Merged SJ Details"
    ↓
User sees which SJs were merged into each recap
    ↓
User can reference specific SJ numbers
```

### 3. View Individual SJ
```
User scrolls further down
    ↓
User sees individual SJ cards
    ↓
User can view, edit, print, or upload documents
```

---

## Key Features

✅ **Automatic Calculation**: Metrics update automatically based on data  
✅ **No Manual Input**: Summary is generated from existing data  
✅ **Real-time Updates**: Changes reflect immediately  
✅ **Mobile Responsive**: Works on all screen sizes  
✅ **Color Coded**: Easy visual scanning  
✅ **Detailed Breakdown**: See exactly which SJs were merged  
✅ **Non-intrusive**: Doesn't interfere with existing functionality  

---

## Tips for Users

1. **Quick Overview**: Check summary metrics first to understand recap volume
2. **Verify Merges**: Use merged SJ details to verify correct SJs were consolidated
3. **Track Changes**: Monitor total quantity to ensure no data loss
4. **Reference SJs**: Use merged SJ numbers for audit trails and tracking
5. **Export Data**: Use the individual SJ cards to print or export specific recaps

---

## Example Scenarios

### Scenario 1: Daily Recap Review
```
Manager opens Recap tab
Sees: 3 new recaps created, 15 SJs merged, 120 items, 500 PCS
Action: Verifies all SJs are accounted for
```

### Scenario 2: Audit Trail
```
Auditor needs to verify SJ consolidation
Sees: SJ-2026-001 merged from [SJ-0001, SJ-0002, SJ-0003]
Action: Confirms correct SJs were merged
```

### Scenario 3: Volume Tracking
```
Logistics manager tracks daily volume
Sees: Total Quantity = 250 PCS
Action: Compares with expected shipment volume
```

---

**Visual Guide Complete** ✅

