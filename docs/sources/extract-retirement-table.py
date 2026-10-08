"""Read government HTML tables, expanding rowspans. No calculator formula used.
Requires beautifulsoup4. Run from repository root after downloading source HTML.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import re
import csv

source = Path('docs/sources/retirement-official.html')
soup = BeautifulSoup(source.read_text(encoding='utf-8'), 'html.parser')
tables = soup.find_all('table')
records = []
for table_index, category in [(1, 'MALE'), (2, 'MALE'), (3, 'FEMALE_55'), (4, 'FEMALE_50'), (5, 'FEMALE_50')]:
    grid = {}
    for row_index, tr in enumerate(tables[table_index].find_all('tr')):
        column = 0
        for cell in tr.find_all(['td', 'th'], recursive=False):
            while (row_index, column) in grid:
                column += 1
            text = cell.get_text('', strip=True)
            rowspan, colspan = int(cell.get('rowspan', 1)), int(cell.get('colspan', 1))
            for dr in range(rowspan):
                for dc in range(colspan):
                    grid[row_index + dr, column + dc] = text
            column += colspan
        cells = []
        for column in range(24):
            value = grid.get((row_index, column), '')
            if value and (not cells or value != cells[-1]):
                cells.append(value)
        date_positions = [i for i, value in enumerate(cells) if re.fullmatch(r'\d{4}年\d+月', value)]
        for pair in range(0, len(date_positions) - 1, 2):
            bpos, rpos = date_positions[pair:pair + 2]
            birth = re.fullmatch(r'(\d{4})年(\d+)月', cells[bpos])
            retirement = re.fullmatch(r'(\d{4})年(\d+)月', cells[rpos])
            delay = cells[rpos + 1] if len(cells) > rpos + 1 else ''
            if birth and retirement and delay.isdigit():
                records.append([category, f'{birth[1]}-{int(birth[2]):02}', f'{retirement[1]}-{int(retirement[2]):02}', delay])
unique = sorted(set(tuple(row) for row in records))
out = Path('src/test/resources/official-retirement.csv')
out.parent.mkdir(parents=True, exist_ok=True)
with out.open('w', encoding='utf-8', newline='') as stream:
    writer = csv.writer(stream)
    writer.writerow(['category', 'birth', 'retirement', 'delay'])
    writer.writerows(unique)
print('Official rows:', len(unique))
for cat in ['MALE', 'FEMALE_55', 'FEMALE_50']:
    print(cat, sum(row[0] == cat for row in unique))
