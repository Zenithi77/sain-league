import json, shutil, os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Backup first
shutil.copy('data/database.json', 'data/database.json.bak')

with open('data/database.json', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix double-encoded UTF-8 (UTF-8 bytes misread as Windows-1252)
fixed = content.encode('cp1252').decode('utf-8')

# Validate it's still valid JSON
data = json.loads(fixed)

# Write back properly formatted
with open('data/database.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print('=== Teams ===')
for t in data['teams']:
    print(f"  {t['id']}: {t['name']} - {t['school']} ({t['city']})")
print(f"\n=== Players ({len(data['players'])} total) ===")
for p in data['players'][:10]:
    print(f"  {p['name']} ({p['position']}) - {p['height']} - Team: {p['teamId']}")
print("  ...")
print("\nDone! Encoding fixed.")
