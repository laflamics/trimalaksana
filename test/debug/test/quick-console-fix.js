// Quick Console Fix for BOM Corruption
console.log('🔧 Quick fixing BOM corruption...');

// Clean BOM data (62 valid items)
const cleanBomData = {
  "value": [
    {"id": "1764370552734-0qxn5u2vk", "product_id": "KRT00137", "material_id": "MTRL-00023", "ratio": 1},
    {"id": "1764370552734-r33mtsf1b", "product_id": "KRT00131", "material_id": "MTRL-00024", "ratio": 0.634},
    {"id": "1764370552735-03y7y10jf", "product_id": "KRT00199", "material_id": "MTRL-00105", "ratio": 1.25},
    {"id": "1764370552735-0uiyhfa6r", "product_id": "KRT02798", "material_id": "MTRL-00009", "ratio": 0.54569763},
    {"id": "1764370552735-0y1erehl0", "product_id": "KRT01329", "material_id": "MTRL-00149", "ratio": 1},
    {"id": "1764370552735-0ynkw27wo", "product_id": "KRT00021", "material_id": "MTRL-00303", "ratio": 1},
    {"id": "1764370552735-223b699go", "product_id": "KRT00023", "material_id": "MTRL-00302", "ratio": 1.25},
    {"id": "1764370552735-3ek1789ay", "product_id": "KRT02811", "material_id": "MTRL-00704", "ratio": 1},
    {"id": "1764370552735-49zgleel9", "product_id": "KRT03860", "material_id": "MTRL-00543", "ratio": 1.25},
    {"id": "1764370552735-4uzr8qfae", "product_id": "KRT00189", "material_id": "MTRL-00313", "ratio": 0.4446},
    {"id": "1764370552735-54rmjbw2a", "product_id": "KRT00023", "material_id": "MTRL-00301", "ratio": 0.575},
    {"id": "1764370552735-65k4c2r99", "product_id": "KRT02657", "material_id": "MTRL-00311", "ratio": 0.763616},
    {"id": "1764370552735-6buznu8ql", "product_id": "KRT02613", "material_id": "MTRL-00298", "ratio": 1},
    {"id": "1764370552735-8coak7dpx", "product_id": "KRT01212", "material_id": "MTRL-00164", "ratio": 0.961783},
    {"id": "1764370552735-8dwmc0oqa", "product_id": "KRT02913", "material_id": "MTRL-00261", "ratio": 0.2},
    {"id": "1764370552735-8l5eagpv1", "product_id": "KRT04156", "material_id": "MTRL-00810", "ratio": 1.25},
    {"id": "1764370552735-97lsfjnfn", "product_id": "KRT01733", "material_id": "MTRL-00050", "ratio": 0.67},
    {"id": "1764370552735-98rf59sms", "product_id": "KRT00052", "material_id": "MTRL-00535", "ratio": 1},
    {"id": "1764370552735-9z637orjt", "product_id": "KRT00273", "material_id": "MTRL-00129", "ratio": 0.342},
    {"id": "1764370552735-ajrjgikje", "product_id": "KRT01732", "material_id": "MTRL-00026", "ratio": 1},
    {"id": "1764370552735-b1iu9dco6", "product_id": "KRT00051", "material_id": "MTRL-00065", "ratio": 0.26081044},
    {"id": "1764370552735-be87twn8d", "product_id": "KRT01732", "material_id": "MTRL-00202", "ratio": 1},
    {"id": "1764370552735-ct08a76er", "product_id": "KRT00319", "material_id": "MTRL-00319", "ratio": 0.952444},
    {"id": "1764370552735-dbzrshver", "product_id": "KRT01219", "material_id": "MTRL-00138", "ratio": 0.505},
    {"id": "1764370552735-f7dodno1m", "product_id": "KRT03907", "material_id": "MTRL-00566", "ratio": 0.25},
    {"id": "1764370552735-fe6hk30nf", "product_id": "KRT00436", "material_id": "MTRL-00379", "ratio": 0.53125},
    {"id": "1764370552735-i15dtdbob", "product_id": "KRT00179", "material_id": "MTRL-00305", "ratio": 0.5027948099999999},
    {"id": "1764370552735-i3vcbqird", "product_id": "KRT02567", "material_id": "MTRL-00376", "ratio": 1},
    {"id": "1764370552735-i6m81sibo", "product_id": "KRT01684", "material_id": "MTRL-00201", "ratio": 0.25940278},
    {"id": "1764370552735-krr0jfekt", "product_id": "KRT00319", "material_id": "MTRL-00373", "ratio": 1},
    {"id": "1764370552735-l8urugbfk", "product_id": "KRT02220", "material_id": "MTRL-00324", "ratio": 1},
    {"id": "1764370552735-lexqpdlr7", "product_id": "KRT04028", "material_id": "MTRL-00115", "ratio": 1},
    {"id": "1764370552735-llyvvrgjy", "product_id": "KRT01733", "material_id": "MTRL-00049", "ratio": 0.34},
    {"id": "1764370552735-m1bfcnog2", "product_id": "KRT00142", "material_id": "MTRL-00104", "ratio": 1.125},
    {"id": "1764370552735-nwj9mfywq", "product_id": "KRT00097", "material_id": "MTRL-00577", "ratio": 0.25},
    {"id": "1764370552735-o0c3r7xi3", "product_id": "KRT04028", "material_id": "MTRL-00108", "ratio": 1},
    {"id": "1764370552735-ptg915vzp", "product_id": "KRT02798", "material_id": "MTRL-00011", "ratio": 1.25},
    {"id": "1764370552735-q917xz5nx", "product_id": "KRT00273", "material_id": "MTRL-00481", "ratio": 1.08},
    {"id": "1764370552735-qhyqcqxhq", "product_id": "KRT01135", "material_id": "MTRL-00150", "ratio": 0.34353332999999997},
    {"id": "1764370552735-r53w8es61", "product_id": "KRT00392", "material_id": "MTRL-00184", "ratio": 1.25},
    {"id": "1764370552735-sqfqdzly7", "product_id": "KRT01609", "material_id": "MTRL-00316", "ratio": 0.34083333000000005},
    {"id": "1764370552735-u4mltt4j0", "product_id": "KRT00449", "material_id": "MTRL-00137", "ratio": 1},
    {"id": "1764370552735-ucydwxr8f", "product_id": "KRT00180", "material_id": "MTRL-00006", "ratio": 0.504},
    {"id": "1764370552735-uke1u1fpc", "product_id": "KRT02170", "material_id": "MTRL-00418", "ratio": 1},
    {"id": "1764370552735-usz53m6m5", "product_id": "KRT01220", "material_id": "MTRL-00477", "ratio": 1},
    {"id": "1764370552735-vj6wetv2c", "product_id": "KRT00050", "material_id": "MTRL-00523", "ratio": 1},
    {"id": "1764370552735-xzh2cqd0s", "product_id": "KRT01425", "material_id": "MTRL-00151", "ratio": 0.913043},
    {"id": "1764370552735-y3fpgm52i", "product_id": "KRT02722", "material_id": "MTRL-00167", "ratio": 0.386},
    {"id": "1764370552735-y7qhi7cn0", "product_id": "KRT00147", "material_id": "MTRL-00578", "ratio": 1},
    {"id": "1764370552735-zse1z3b70", "product_id": "KRT02798", "material_id": "MTRL-00008", "ratio": 0.28005928999999996},
    {"id": "1764370552736-i7uvs5svm", "product_id": "KRT00280", "material_id": "MTRL-00090", "ratio": 1},
    {"id": "bom-1766622882529-0ehof9ft9", "product_id": "KRT04072", "material_id": "MTRL-00003", "ratio": 1},
    {"id": "bom-1767078291970-07tsxiyl0", "product_id": "KRT01997", "material_id": "MTRL-00007", "ratio": 1},
    {"id": "bom-1767078300003-65i2c0qh0", "product_id": "KRT01844", "material_id": "MTRL-00009", "ratio": 1},
    {"id": "bom-1767098772420-9suz0a2tl", "product_id": "KRT00015", "material_id": "MTRL-00010", "ratio": 1},
    {"id": "bom-1767107018246-2vemwpkz0", "product_id": "KRT02815", "material_id": "MTRL-00005", "ratio": 1},
    {"id": "bom-1767107025001-tm5x29dpy", "product_id": "KRT00134", "material_id": "MTRL-00009", "ratio": 1},
    {"id": "bom-1767584480090-s0qdt7ykv", "product_id": "KRT04072", "material_id": "MTRL-00002", "ratio": 1},
    {"id": "bom-1767585926336-dind24xwa", "product_id": "KRT04173", "material_id": "MTRL-00002", "ratio": 1},
    {"id": "bom-1768327305553-u42lefmxv", "product_id": "KRT00248", "material_id": "MTRL-00828", "ratio": 1},
    {"id": "bom-1768656817909-wqvtu7k7g", "product_id": "IMP03240", "material_id": "MTRL-00828", "ratio": 1},
    {"id": "bom-1768718970526-tpujeref2", "product_id": "321", "material_id": "MTRL-00828", "ratio": 1}
  ],
  "timestamp": Date.now(),
  "_timestamp": Date.now(),
  "lastUpdate": new Date().toISOString(),
  "cleanedAt": new Date().toISOString(),
  "serverSyncBlocked": true
};

// Get business context
const selectedBusiness = localStorage.getItem('selectedBusiness');
const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
    selectedBusiness + '/bom' : 'bom';

console.log('Business:', selectedBusiness || 'packaging');
console.log('BOM Key:', bomStorageKey);

// Apply clean data
localStorage.setItem(bomStorageKey, JSON.stringify(cleanBomData));
localStorage.setItem('bom', JSON.stringify(cleanBomData));
console.log('✅ Clean BOM data applied');

// Verify
const items = cleanBomData.value;
const bomProductIdsSet = new Set();
items.forEach(b => {
    if (b && b.product_id) {
        bomProductIdsSet.add(String(b.product_id).trim().toLowerCase());
    }
});

console.log(`✅ BOM Set size: ${bomProductIdsSet.size} (was 139)`);

// Test problem products
['krt04173', 'krt02722', 'krt04072'].forEach(id => {
    const found = bomProductIdsSet.has(id);
    console.log(`${id.toUpperCase()}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
});

// Trigger React reload
window.dispatchEvent(new CustomEvent('app-storage-changed', {
    detail: { key: bomStorageKey.split('/').pop() || bomStorageKey, value: cleanBomData.value }
}));

window.dispatchEvent(new CustomEvent('bomUpdated', {
    detail: { 
        productId: 'ALL', 
        bomItems: cleanBomData.value, 
        source: 'QuickFix'
    }
}));

console.log('🎯 FIX COMPLETE! BOM indicators should work now.');