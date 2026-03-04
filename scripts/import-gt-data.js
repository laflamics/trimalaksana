#!/usr/bin/env node

/**
 * Import GT data (customers, products, suppliers, user access)
 * Usage: node scripts/import-gt-data.js <serverUrl>
 * Example: node scripts/import-gt-data.js http://100.81.50.37:9999
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_URL = process.argv[2] || 'http://100.81.50.37:9999';

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

async function callApi(endpoint, method = 'POST', data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error.response?.data || error.message);
    throw error;
  }
}

async function importGTCustomers() {
  console.log('\n=== Importing GT Customers ===');
  const filePath = path.join(__dirname, 'master/gt/gt_customers.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.error('No customer data found');
    return 0;
  }

  try {
    // Extract just the value array, no wrapper
    const payload = { value: data.value };
    await callApi(`/api/storage/gt_customers`, 'POST', payload);
    console.log(`✓ Imported ${data.value.length} GT customers`);
    return data.value.length;
  } catch (error) {
    console.error(`✗ Failed to import GT customers:`, error.message);
    return 0;
  }
}

async function importGTProducts() {
  console.log('\n=== Importing GT Products ===');
  const filePath = path.join(__dirname, 'master/gt/gt_products.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.error('No product data found');
    return 0;
  }

  try {
    const payload = { value: data.value };
    await callApi(`/api/storage/gt_products`, 'POST', payload);
    console.log(`✓ Imported ${data.value.length} GT products`);
    return data.value.length;
  } catch (error) {
    console.error(`✗ Failed to import GT products:`, error.message);
    return 0;
  }
}

async function importGTSuppliers() {
  console.log('\n=== Importing GT Suppliers ===');
  const filePath = path.join(__dirname, 'master/gt/gt_suppliers.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value || data.value.length === 0) {
    console.log('No supplier data found (empty)');
    return 0;
  }

  try {
    const payload = { value: data.value };
    await callApi(`/api/storage/gt_suppliers`, 'POST', payload);
    console.log(`✓ Imported ${data.value.length} GT suppliers`);
    return data.value.length;
  } catch (error) {
    console.error(`✗ Failed to import GT suppliers:`, error.message);
    return 0;
  }
}

async function importGTUserAccess() {
  console.log('\n=== Importing GT User Access Control ===');
  const filePath = path.join(__dirname, 'master/gt/gt_userAccessControl.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.error('No user access data found');
    return 0;
  }

  try {
    const payload = { value: data.value };
    await callApi(`/api/storage/gt_userAccessControl`, 'POST', payload);
    console.log(`✓ Imported ${data.value.length} GT users`);
    return data.value.length;
  } catch (error) {
    console.error(`✗ Failed to import GT users:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('Starting GT data import...');
  console.log(`API URL: ${API_URL}`);

  try {
    const customers = await importGTCustomers();
    const products = await importGTProducts();
    const suppliers = await importGTSuppliers();
    const users = await importGTUserAccess();

    console.log('\n\n=== IMPORT SUMMARY ===');
    console.log(`Customers: ${customers}`);
    console.log(`Products: ${products}`);
    console.log(`Suppliers: ${suppliers}`);
    console.log(`Users: ${users}`);
    console.log(`\nTotal: ${customers + products + suppliers + users} records`);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
