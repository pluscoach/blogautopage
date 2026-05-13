import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('exe/c_how_clean.html', 'r', encoding='utf-8') as f:
    html = f.read()

keep_props = {
    'font-size', 'font-weight', 'font-family', 'font-style',
    'color', 'background-color', 'background',
    'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
    'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
    'border', 'border-top', 'border-bottom', 'border-left', 'border-right',
    'border-radius',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
    'border-start-start-radius', 'border-start-end-radius', 'border-end-start-radius', 'border-end-end-radius',
    'width', 'height', 'max-width', 'max-height',
    'inline-size', 'block-size', 'max-inline-size', 'max-block-size',
    'display', 'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
    'align-items', 'justify-content', 'align-self', 'place-items', 'place-content',
    'gap', 'row-gap', 'column-gap',
    'position', 'top', 'bottom', 'left', 'right',
    'z-index', 'overflow', 'overflow-x', 'overflow-y',
    'opacity',
    'text-align', 'line-height', 'letter-spacing', 'white-space',
    'box-shadow', '-webkit-text-fill-color', 'box-sizing',
}

skip_exact = {
    ('display', 'block'), ('position', 'static'), ('opacity', '1'),
    ('overflow', 'visible'), ('flex-grow', '0'), ('flex-shrink', '1'),
    ('flex-wrap', 'nowrap'), ('text-align', 'start'), ('text-align', 'left'),
    ('letter-spacing', 'normal'), ('line-height', 'normal'),
    ('box-shadow', 'none'), ('z-index', 'auto'), ('box-sizing', 'content-box'),
    ('white-space', 'normal'),
    ('max-width', 'none'), ('max-height', 'none'),
    ('max-inline-size', 'none'), ('max-block-size', 'none'),
    ('width', 'auto'), ('height', 'auto'), ('inline-size', 'auto'),
}

keep_css_vars = {'--ink', '--bg', '--ink-2', '--ink-3', '--green', '--green-deep', '--green-glow', '--line', '--line-2', '--panel', '--green-soft', '--dc-inv-zoom'}

def clean_style(style_str):
    props = []
    for part in style_str.split(';'):
        part = part.strip()
        if not part or ':' not in part:
            continue
        colon = part.find(':')
        prop = part[:colon].strip()
        val = part[colon+1:].strip()

        if prop.startswith('--'):
            if prop in keep_css_vars:
                props.append(f'{prop}:{val}')
            continue

        if prop not in keep_props:
            continue
        if (prop, val) in skip_exact:
            continue

        # Skip border noise
        if 'border' in prop and ('none' in val or val == '0px'):
            continue
        if prop.endswith('-radius') and val == '0px':
            continue

        # Skip transparent backgrounds
        if prop in ('background', 'background-color') and ('rgba(0, 0, 0, 0)' in val or val == 'transparent'):
            continue

        # Simplify background shorthand to just color
        if prop == 'background' and 'repeat scroll padding-box' in val:
            m = re.match(r'none 0% 0% / auto repeat scroll padding-box border-box (rgb\([^)]+\))', val)
            if m:
                props.append(f'background-color:{m.group(1)}')
                continue

        props.append(f'{prop}:{val}')
    return ';'.join(props)

def replace_style(match):
    cleaned = clean_style(match.group(1))
    return f'style="{cleaned}"' if cleaned else ''

result = re.sub(r'style="([^"]+)"', replace_style, html)
result = re.sub(r'\s*style="\s*"', '', result)

with open('exe/c_how_optimized.html', 'w', encoding='utf-8') as f:
    f.write(result)

print(f'Original: {len(html):,} chars ({len(html)//1024}KB)')
print(f'Optimized v2: {len(result):,} chars ({len(result)//1024}KB)')
