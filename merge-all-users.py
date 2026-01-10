#!/usr/bin/env python3
import json
import time
import os

def load_json_safe(filepath):
    """Load JSON file safely, return empty list if file doesn't exist or is invalid"""
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                data = json.load(f)
                if isinstance(data, dict) and 'value' in data:
                    return data['value']
                elif isinstance(data, list):
                    return data
        return []
    except Exception as e:
        print(f"Warning: Could not load {filepath}: {e}")
        return []

# Load data from all possible locations
print("🔍 Loading user data from all sources...")

# Main unified file
unified_users = load_json_safe('./data/localStorage/userAccessControl.json')
print(f"Unified file: {len(unified_users)} users")

# Packaging specific
packaging_users = load_json_safe('./data/localStorage/packaging_userAccessControl.json')
print(f"Packaging file: {len(packaging_users)} users")

# General Trading specific
gt_users = load_json_safe('./data/localStorage/general-trading/general-trading_userAccessControl.json')
print(f"GT file: {len(gt_users)} users")

# Trucking specific
trucking_users = load_json_safe('./data/localStorage/trucking/trucking_userAccessControl.json')
print(f"Trucking file: {len(trucking_users)} users")

# Also check alternative locations
gt_users2 = load_json_safe('./data/localStorage/general-trading/userAccessControl.json')
print(f"GT alternative file: {len(gt_users2)} users")

trucking_users2 = load_json_safe('./data/localStorage/trucking/userAccessControl.json')
print(f"Trucking alternative file: {len(trucking_users2)} users")

# Combine all users
all_users = []
all_users.extend(unified_users)
all_users.extend(packaging_users)
all_users.extend(gt_users)
all_users.extend(trucking_users)
all_users.extend(gt_users2)
all_users.extend(trucking_users2)

print(f"\n📊 Total users from all sources: {len(all_users)}")

# Deduplicate by ID, keeping the one with latest updatedAt
user_map = {}
for user in all_users:
    if user and 'id' in user:
        user_id = user['id']
        if user_id not in user_map:
            user_map[user_id] = user
        else:
            # Keep the one with latest updatedAt
            existing = user_map[user_id]
            existing_time = existing.get('updatedAt', '1970-01-01T00:00:00.000Z')
            user_time = user.get('updatedAt', '1970-01-01T00:00:00.000Z')
            if user_time > existing_time:
                user_map[user_id] = user

deduplicated_users = list(user_map.values())
print(f"After deduplication: {len(deduplicated_users)} users")

# Filter active users only (not deleted)
active_users = []
for user in deduplicated_users:
    if (user.get('isActive') == True and 
        not user.get('deleted') and 
        not user.get('deletedAt') and 
        not user.get('deletedTimestamp')):
        active_users.append(user)

print(f"Active users: {len(active_users)}")
print(f"Deleted users filtered out: {len(deduplicated_users) - len(active_users)}")

print("\n👥 Active users found:")
for user in active_users:
    business_units = ', '.join(user.get('businessUnits', []))
    print(f"- {user['fullName']} ({user['username']}) - {user.get('role', 'No Role')} - [{business_units}]")

# Create the final unified data structure
final_data = {
    "value": active_users,
    "timestamp": int(time.time() * 1000),
    "_timestamp": int(time.time() * 1000)
}

# Backup the current unified file
backup_path = f"./data/localStorage/userAccessControl.json.backup.{int(time.time())}"
if os.path.exists('./data/localStorage/userAccessControl.json'):
    os.rename('./data/localStorage/userAccessControl.json', backup_path)
    print(f"\n💾 Backup created: {backup_path}")

# Save the merged and cleaned data
with open('./data/localStorage/userAccessControl.json', 'w') as f:
    json.dump(final_data, f, indent=2)

print(f'\n✅ Merged data saved to userAccessControl.json')
print(f'📈 Final result: {len(active_users)} active users from all business units')