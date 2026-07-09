import os
import io
import struct
import tempfile
from flask import Flask, request, send_file
from litemapy import Schematic

app = Flask(__name__, static_folder='static')

WOOL_COLORS = {
    'minecraft:white_wool': (233, 236, 239),
    'minecraft:orange_wool': (241, 148, 84),
    'minecraft:magenta_wool': (199, 78, 189),
    'minecraft:light_blue_wool': (118, 175, 219),
    'minecraft:yellow_wool': (253, 221, 36),
    'minecraft:lime_wool': (113, 191, 48),
    'minecraft:pink_wool': (243, 139, 170),
    'minecraft:gray_wool': (84, 84, 84),
    'minecraft:light_gray_wool': (159, 159, 159),
    'minecraft:cyan_wool': (41, 127, 163),
    'minecraft:purple_wool': (137, 50, 184),
    'minecraft:blue_wool': (53, 78, 169),
    'minecraft:brown_wool': (112, 69, 41),
    'minecraft:green_wool': (71, 109, 30),
    'minecraft:red_wool': (176, 46, 38),
    'minecraft:black_wool': (30, 27, 26),
}

WOOL_IDS = set(WOOL_COLORS.keys())

def write_triangle(buf, normal, v0, v1, v2):
    for f in normal:
        buf.write(struct.pack('<f', float(f)))
    for v in (v0, v1, v2):
        for f in v:
            buf.write(struct.pack('<f', float(f)))
    buf.write(struct.pack('<H', 0))

def write_box(buf, x0, y0, z0, x1, y1, z1):
    """Write 12 triangles for an axis-aligned box."""
    v = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1),
    ]
    faces = [
        ((0, 0, 1), v[4], v[5], v[6], v[7]),
        ((0, 0, -1), v[1], v[0], v[3], v[2]),
        ((0, 1, 0), v[3], v[2], v[6], v[7]),
        ((0, -1, 0), v[0], v[1], v[5], v[4]),
        ((1, 0, 0), v[5], v[1], v[2], v[6]),
        ((-1, 0, 0), v[0], v[4], v[7], v[3]),
    ]
    for normal, v0, v1, v2, v3 in faces:
        write_triangle(buf, normal, v0, v1, v2)
        write_triangle(buf, normal, v0, v2, v3)

def write_cube(buf, x, y, z):
    write_box(buf, x, y, z, x + 1, y + 1, z + 1)

def write_slab(buf, x, y, z, slab_type):
    """bottom: y 0-0.5, top: y 0.5-1, double: full."""
    if slab_type == 'top':
        write_box(buf, x, y + 0.5, z, x + 1, y + 1, z + 1)
    elif slab_type == 'double':
        write_cube(buf, x, y, z)
    else:
        write_box(buf, x, y, z, x + 1, y + 0.5, z + 1)

def stair_step_boxes(facing, shape):
    """Return list of (x0, z0, x1, z1) for step boxes in unit coords (half=bottom upper part)."""
    if facing == 'north':
        front = (0, 0, 1, 0.5); back = (0, 0.5, 1, 1)
        right = (0.5, 0, 1, 1); left = (0, 0, 0.5, 1)
    elif facing == 'south':
        front = (0, 0.5, 1, 1); back = (0, 0, 1, 0.5)
        right = (0, 0, 0.5, 1); left = (0.5, 0, 1, 1)
    elif facing == 'west':
        front = (0, 0, 0.5, 1); back = (0.5, 0, 1, 1)
        right = (0, 0, 1, 0.5); left = (0, 0.5, 1, 1)
    else:  # east
        front = (0.5, 0, 1, 1); back = (0, 0, 0.5, 1)
        right = (0, 0.5, 1, 1); left = (0, 0, 1, 0.5)

    def intersect(b1, b2):
        return (max(b1[0], b2[0]), max(b1[1], b2[1]), min(b1[2], b2[2]), min(b1[3], b2[3]))

    if shape == 'straight':
        return [front]
    elif shape == 'outer_right':
        return [intersect(front, right)]
    elif shape == 'outer_left':
        return [intersect(front, left)]
    elif shape == 'inner_right':
        return [front, intersect(back, right)]
    elif shape == 'inner_left':
        return [front, intersect(back, left)]
    return [front]

def write_stair(buf, x, y, z, facing, half, shape):
    boxes = stair_step_boxes(facing, shape)
    if half == 'top':
        write_box(buf, x, y + 0.5, z, x + 1, y + 1, z + 1)
        y0, y1 = y, y + 0.5
    else:
        write_box(buf, x, y, z, x + 1, y + 0.5, z + 1)
        y0, y1 = y + 0.5, y + 1
    for x0, z0, x1, z1 in boxes:
        write_box(buf, x + x0, y0, z + z0, x + x1, y1, z + z1)

def entry_triangles(entry):
    kind = entry[0]
    if kind == 'cube':
        return 12
    elif kind == 'slab':
        return 12
    elif kind == 'stair':
        s = entry[6] if len(entry) > 6 else 'straight'
        return 36 if s in ('inner_right', 'inner_left') else 24
    return 0

def litematic_to_stl(filepath):
    schem = Schematic.load(filepath)

    entries = []
    for region in schem.regions.values():
        for x in region.range_x():
            for y in region.range_y():
                for z in region.range_z():
                    block = region[x, y, z]
                    bid = block.id
                    if bid in WOOL_IDS:
                        entries.append(('cube', x, y, z))
                    elif bid == 'minecraft:oak_slab':
                        slab_type = block['type'] if 'type' in block else 'bottom'
                        entries.append(('slab', x, y, z, slab_type))
                    elif bid == 'minecraft:oak_stairs':
                        facing = block['facing'] if 'facing' in block else 'north'
                        half = block['half'] if 'half' in block else 'bottom'
                        shape = block['shape'] if 'shape' in block else 'straight'
                        entries.append(('stair', x, y, z, facing, half, shape))

    tri_count = sum(entry_triangles(e) for e in entries)

    buf = io.BytesIO()
    buf.write(b'\x00' * 80)
    buf.write(struct.pack('<I', tri_count))

    for e in entries:
        kind = e[0]
        if kind == 'cube':
            write_cube(buf, e[1], e[2], e[3])
        elif kind == 'slab':
            write_slab(buf, e[1], e[2], e[3], e[4])
        elif kind == 'stair':
            write_stair(buf, e[1], e[2], e[3], e[4], e[5], e[6] if len(e) > 6 else 'straight')

    return buf.getvalue()

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    if 'file' not in request.files:
        return 'No file uploaded', 400

    file = request.files['file']
    if file.filename == '':
        return 'No file selected', 400

    temp_path = os.path.join(tempfile.gettempdir(), 'litematica_' + file.filename)
    file.save(temp_path)

    try:
        stl_data = litematic_to_stl(temp_path)
        return send_file(
            io.BytesIO(stl_data),
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=os.path.splitext(file.filename)[0] + '.stl'
        )
    finally:
        os.remove(temp_path)

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True)
