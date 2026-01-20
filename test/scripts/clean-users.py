#!/usr/bin/env python3
import json
import time

# Read the current data
with open('./data/localStorage/userAccessControl.json', 'r') as f:
    data = json.load(f)

print(f"Total users before cleanup: {len(data['value'])}")

# Filter active users only (not deleted)
active_users = []
for user in data['value']:
    if (user.get('isActive') == True and 
        not user.get('deleted') and 
        not user.get('deletedAt') and 
        not user.get('deletedTimestamp')):
        active_users.append(user)

print(f"Active users after cleanup: {len(active_users)}")
print(f"Users removed: {len(data['value']) - len(active_users)}")

print("\nActive users:")
for user in active_users:
    print(f"- {user['fullName']} ({user['username']}) - {user['role']}")

# Update the data
data['value'] = active_users
data['timestamp'] = int(time.time() * 1000)
data['_timestamp'] = int(time.time() * 1000)

# Save cleaned data
with open('./data/localStorage/userAccessControl.json', 'w') as f:
    json.dump(data, f, indent=2)

print('\n✅ Data cleaned and saved!')