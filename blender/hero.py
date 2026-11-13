# Hero plate: Starship V3 stack on the pad at dusk, drone camera a few hundred
# metres out. Everything is generated here, so the render is reproducible:
#
#   blender -b -P blender/hero.py            (see blender/render.ps1 on Windows)
#
# Environment variables: HERO_W, HERO_H (pixels), HERO_SPP (samples),
# HERO_NAME (output file stem). Output goes to blender/out/.
#
# Liftoff: HERO_T=<seconds after ignition> renders one frame of the launch.
# HERO_SEQ="t0,t1,count" renders a numbered sequence in one session.
import bpy, bmesh, json, math, os, random, sys, time, traceback
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)
NAME = os.environ.get("HERO_NAME", "hero")
LOG = os.path.join(OUT, NAME + ".log")
DONE = os.path.join(OUT, NAME + ".done")
for f in (LOG, DONE):
    if os.path.exists(f):
        os.remove(f)


def log(*a):
    with open(LOG, "a", encoding="utf8") as fh:
        fh.write(" ".join(str(x) for x in a) + "\n")


DATA = json.load(open(os.path.join(HERE, "..", "data", "rockets.json"), encoding="utf8"))["hero"]
STACK_H = DATA["stackHeight"]["value"]
BOOSTER_H = DATA["boosterHeight"]["value"]
SHIP_H = STACK_H - BOOSTER_H
R = DATA["diameter"]["value"] / 2
PAD_H = 12.0  # generic launch-mount deck height, not a measured value
TOWER_H = 146.0
TX = -25.0  # tower centre
TW = 12.0  # tower width
RING = 1.83
rnd = random.Random(7)

# ----------------------------------------------------------------- helpers


def V(x, y, z):
    return Vector((x, y, z))


def beam(bm, a, b, w, d=None, roll=0.0):
    """Box-section member from a to b."""
    a, b = Vector(a), Vector(b)
    axis = b - a
    q = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    m = Matrix.Translation((a + b) / 2) @ q @ Matrix.Rotation(roll, 4, "Z") @ Matrix.Diagonal((w, d or w, axis.length, 1))
    bmesh.ops.create_cube(bm, size=1.0, matrix=m)


def tube(bm, a, b, r, seg=10, r2=None):
    a, b = Vector(a), Vector(b)
    axis = b - a
    q = axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    m = Matrix.Translation((a + b) / 2) @ q
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=axis.length, matrix=m)


def slab(bm, c, sx, sy, sz, rz=0.0):
    m = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Diagonal((sx, sy, sz, 1))
    bmesh.ops.create_cube(bm, size=1.0, matrix=m)


def obj(name, bm, mat, bevel=0.0, smooth=False, mats=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    for m in mats or [mat]:
        me.materials.append(m)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    if bevel:
        mod = o.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
    return o


# --------------------------------------------------------------- materials


def nodes_of(mat):
    try:
        mat.use_nodes = True
    except Exception:
        pass
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    return nt, bsdf


def N(nt, kind, **props):
    n = nt.nodes.new(kind)
    for k, v in props.items():
        setattr(n, k, v)
    return n


def L(nt, a, b):
    nt.links.new(a, b)


def math_node(nt, op, a, b=None, clamp=False):
    n = N(nt, "ShaderNodeMath", operation=op, use_clamp=clamp)
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            L(nt, v, n.inputs[i])
    return n.outputs[0]


def mix_rgb(nt, fac, a, b):
    n = N(nt, "ShaderNodeMix", data_type="RGBA")
    for k, (sock, v) in enumerate(((n.inputs[0], fac), (n.inputs[6], a), (n.inputs[7], b))):
        if hasattr(v, "is_linked"):
            L(nt, v, sock)
        elif isinstance(v, (int, float)):
            sock.default_value = v if k == 0 else (v, v, v, 1.0)
        else:
            sock.default_value = (*v, 1.0) if len(v) == 3 else v
    return n.outputs[2]


def noise(nt, scale, detail=6.0, rough=0.6, vec=None, stretch=None):
    n = N(nt, "ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    co = N(nt, "ShaderNodeTexCoord")
    mp = N(nt, "ShaderNodeMapping")
    L(nt, vec if vec is not None else co.outputs["Object"], mp.inputs["Vector"])
    if stretch:
        mp.inputs["Scale"].default_value = stretch
    L(nt, mp.outputs["Vector"], n.inputs["Vector"])
    return n.outputs["Fac"]


def mat_steel(name, frost_bands, soot_to=0.0):
    """Stainless skin. Per-ring variation from the face attribute "rr", frost by height."""
    m = bpy.data.materials.new(name)
    nt, b = nodes_of(m)
    rr = N(nt, "ShaderNodeAttribute", attribute_name="rr").outputs["Fac"]
    geo = N(nt, "ShaderNodeNewGeometry")
    z = N(nt, "ShaderNodeSeparateXYZ")
    co = N(nt, "ShaderNodeTexCoord")
    L(nt, co.outputs["Object"], z.inputs[0])
    zz = z.outputs["Z"]
    streak = noise(nt, 1.0, 8.0, 0.65, stretch=(9.0, 9.0, 0.22))  # vertical run marks
    blotch = noise(nt, 0.35, 4.0, 0.5)
    # roughness: rings differ, streaks and blotches break it up
    rough = math_node(nt, "ADD", math_node(nt, "MULTIPLY", rr, 0.22), 0.2)
    rough = math_node(nt, "ADD", rough, math_node(nt, "MULTIPLY", streak, 0.16))
    rough = math_node(nt, "ADD", rough, math_node(nt, "MULTIPLY", blotch, 0.1))
    base = mix_rgb(nt, rr, (0.50, 0.51, 0.53), (0.66, 0.67, 0.69))
    base = mix_rgb(nt, math_node(nt, "MULTIPLY", streak, 0.35), base, (0.33, 0.33, 0.35))
    # frost mask: union of height bands with a ragged, noisy edge
    edge = math_node(nt, "MULTIPLY", math_node(nt, "SUBTRACT", noise(nt, 0.9, 5.0, 0.6), 0.5), 1.6)
    zn = math_node(nt, "ADD", zz, edge)
    mask = None
    for lo, hi in frost_bands:
        up = math_node(nt, "GREATER_THAN", zn, lo)
        dn = math_node(nt, "LESS_THAN", zz, hi)  # the propellant level is a sharp line
        band = math_node(nt, "MULTIPLY", up, dn)
        mask = band if mask is None else math_node(nt, "MAXIMUM", mask, band)
    patch = math_node(nt, "ADD", math_node(nt, "MULTIPLY", noise(nt, 0.25, 6.0, 0.7), 0.5), 0.62, clamp=True)
    frost = math_node(nt, "MULTIPLY", mask, patch) if mask is not None else None
    if frost is not None:
        fcol = mix_rgb(nt, streak, (0.78, 0.81, 0.85), (0.60, 0.64, 0.69))
        base = mix_rgb(nt, frost, base, fcol)
        metal = math_node(nt, "SUBTRACT", 1.0, math_node(nt, "MULTIPLY", frost, 0.92))
        rough = mix_rgb(nt, frost, rough, 0.78)
        L(nt, metal, b.inputs["Metallic"])
    else:
        b.inputs["Metallic"].default_value = 1.0
    if soot_to > 0:
        s = math_node(nt, "SUBTRACT", 1.0, math_node(nt, "DIVIDE", zz, soot_to), clamp=True)
        s = math_node(nt, "MULTIPLY", s, math_node(nt, "ADD", streak, 0.4), clamp=True)
        base = mix_rgb(nt, s, base, (0.035, 0.03, 0.03))
        rough = mix_rgb(nt, s, rough, 0.85)
    L(nt, base, b.inputs["Base Color"])
    L(nt, rough, b.inputs["Roughness"])
    # dents between welds (oil-canning)
    bump = N(nt, "ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.08
    L(nt, noise(nt, 0.55, 2.0, 0.4, stretch=(1.0, 1.0, 0.5)), bump.inputs["Height"])
    L(nt, bump.outputs["Normal"], b.inputs["Normal"])
    return m


def mat_tiles():
    m = bpy.data.materials.new("tiles")
    nt, b = nodes_of(m)
    co = N(nt, "ShaderNodeTexCoord")
    mp = N(nt, "ShaderNodeMapping")
    L(nt, co.outputs["UV"], mp.inputs["Vector"])
    br = N(nt, "ShaderNodeTexBrick", offset=0.5)
    L(nt, mp.outputs["Vector"], br.inputs["Vector"])
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.012
    br.inputs["Brick Width"].default_value = 0.30
    br.inputs["Row Height"].default_value = 0.26
    br.inputs["Color1"].default_value = (0.012, 0.012, 0.014, 1)
    br.inputs["Color2"].default_value = (0.022, 0.022, 0.025, 1)
    br.inputs["Mortar"].default_value = (0.004, 0.004, 0.004, 1)
    # a few newer, paler tiles
    odd = math_node(nt, "GREATER_THAN", noise(nt, 3.1, 0.0, 0.5, vec=mp.outputs["Vector"]), 0.71)
    col = mix_rgb(nt, math_node(nt, "MULTIPLY", odd, 0.35), br.outputs["Color"], (0.12, 0.11, 0.1))
    L(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.42
    bump = N(nt, "ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.8
    bump.inputs["Distance"].default_value = 0.02
    L(nt, math_node(nt, "SUBTRACT", 1.0, br.outputs["Fac"]), bump.inputs["Height"])
    L(nt, bump.outputs["Normal"], b.inputs["Normal"])
    return m


def mat_paint(name, color, rough=0.5, metal=0.0, grime=0.5):
    """Painted or bare structural steel with grime and worn, rusty patches."""
    m = bpy.data.materials.new(name)
    nt, b = nodes_of(m)
    n1 = noise(nt, 0.6, 8.0, 0.7)
    n2 = noise(nt, 6.0, 6.0, 0.6, stretch=(1.0, 1.0, 0.15))
    ao = N(nt, "ShaderNodeAmbientOcclusion", samples=4)
    ao.inputs["Distance"].default_value = 1.2
    dirt = math_node(nt, "MULTIPLY", math_node(nt, "SUBTRACT", 1.0, ao.outputs["AO"]), grime, clamp=True)
    col = mix_rgb(nt, math_node(nt, "MULTIPLY", n2, 0.4), color, tuple(c * 0.55 for c in color))
    rust = math_node(nt, "GREATER_THAN", n1, 0.66)
    col = mix_rgb(nt, math_node(nt, "MULTIPLY", rust, 0.45 * grime), col, (0.16, 0.07, 0.035))
    col = mix_rgb(nt, dirt, col, (0.02, 0.018, 0.016))
    L(nt, col, b.inputs["Base Color"])
    L(nt, math_node(nt, "ADD", math_node(nt, "MULTIPLY", n1, 0.3), rough - 0.12), b.inputs["Roughness"])
    b.inputs["Metallic"].default_value = metal
    return m


def mat_plain(name, color, rough=0.6, metal=0.0, emit=0.0):
    m = bpy.data.materials.new(name)
    nt, b = nodes_of(m)
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*color, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


def mat_ground():
    m = bpy.data.materials.new("ground")
    nt, b = nodes_of(m)
    big = noise(nt, 0.004, 8.0, 0.6)
    fine = noise(nt, 0.35, 8.0, 0.7)
    col = mix_rgb(nt, big, (0.045, 0.04, 0.03), (0.11, 0.095, 0.07))
    col = mix_rgb(nt, math_node(nt, "MULTIPLY", fine, 0.5), col, (0.03, 0.035, 0.02))
    wet = math_node(nt, "LESS_THAN", big, 0.44)  # standing water in the low ground
    col = mix_rgb(nt, wet, col, (0.01, 0.012, 0.014))
    L(nt, col, b.inputs["Base Color"])
    L(nt, mix_rgb(nt, wet, 0.9, 0.04), b.inputs["Roughness"])
    bump = N(nt, "ShaderNodeBump")
    bump.inputs["Strength"].default_value = 1.0
    bump.inputs["Distance"].default_value = 0.4
    L(nt, math_node(nt, "MULTIPLY", fine, math_node(nt, "SUBTRACT", 1.0, wet)), bump.inputs["Height"])
    L(nt, bump.outputs["Normal"], b.inputs["Normal"])
    return m


def mat_sea():
    m = bpy.data.materials.new("sea")
    nt, b = nodes_of(m)
    b.inputs["Base Color"].default_value = (0.006, 0.012, 0.018, 1)
    b.inputs["Roughness"].default_value = 0.07
    bump = N(nt, "ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    L(nt, noise(nt, 0.06, 5.0, 0.6, stretch=(1.0, 3.0, 1.0)), bump.inputs["Height"])
    L(nt, bump.outputs["Normal"], b.inputs["Normal"])
    return m


def mat_vapour(density, scale=2.6, cut=0.42, name="vapour"):
    """Cold venting gas: a soft-edged, wispy volume."""
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(n)
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    vol = N(nt, "ShaderNodeVolumePrincipled")
    vol.inputs["Color"].default_value = (0.92, 0.94, 0.97, 1)
    vol.inputs["Anisotropy"].default_value = 0.35
    co = N(nt, "ShaderNodeTexCoord")
    ln = N(nt, "ShaderNodeVectorMath", operation="LENGTH")
    L(nt, co.outputs["Object"], ln.inputs[0])
    fall = math_node(nt, "SUBTRACT", 1.0, ln.outputs["Value"], clamp=True)
    fall = math_node(nt, "POWER", fall, 1.4)
    wisps = math_node(nt, "SUBTRACT", noise(nt, scale, 7.0, 0.62, stretch=(1.0, 1.6, 1.3)), cut, clamp=True)
    dens = math_node(nt, "MULTIPLY", math_node(nt, "MULTIPLY", wisps, fall), density * 7.0)
    L(nt, dens, vol.inputs["Density"])
    L(nt, vol.outputs["Volume"], out.inputs["Volume"])
    return m


def mat_flame():
    """Methalox plume: blue-white and very bright at the nozzles, fading to thin orange."""
    m = bpy.data.materials.new("flame")
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(n)
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    vol = N(nt, "ShaderNodeVolumePrincipled")
    co = N(nt, "ShaderNodeTexCoord")
    sp = N(nt, "ShaderNodeSeparateXYZ")
    L(nt, co.outputs["Object"], sp.inputs[0])
    # object space: z runs +0.5 at the engines to -0.5 at the tail, radius 1 at the edge
    along = math_node(nt, "ADD", sp.outputs["Z"], 0.5, clamp=True)
    rad = math_node(nt, "SQRT", math_node(nt, "ADD", math_node(nt, "POWER", sp.outputs["X"], 2.0), math_node(nt, "POWER", sp.outputs["Y"], 2.0)))
    core = math_node(nt, "POWER", math_node(nt, "SUBTRACT", 1.0, rad, clamp=True), 1.6)
    flick = math_node(nt, "ADD", math_node(nt, "MULTIPLY", noise(nt, 3.0, 4.0, 0.6, stretch=(1.0, 1.0, 0.25)), 0.9), 0.55)
    power = math_node(nt, "MULTIPLY", math_node(nt, "MULTIPLY", core, math_node(nt, "POWER", along, 2.2)), flick)
    col = mix_rgb(nt, along, (1.0, 0.42, 0.12), (0.72, 0.8, 1.0))
    L(nt, col, vol.inputs["Emission Color"])
    L(nt, math_node(nt, "MULTIPLY", power, float(os.environ.get("HERO_FLAME", 320.0))), vol.inputs["Emission Strength"])
    L(nt, math_node(nt, "MULTIPLY", core, 0.012), vol.inputs["Density"])
    vol.inputs["Color"].default_value = (1.0, 0.8, 0.6, 1)
    L(nt, vol.outputs["Volume"], out.inputs["Volume"])
    return m


# ------------------------------------------------------------------ models


def shell(name, profile, mats, tile_test=None, segs=160):
    """Lathed skin. profile = [(radius, z, ring_id)], one face attribute per ring."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    rr = bm.faces.layers.float.new("rr")
    ring_rand = {}
    rows = []
    for r, z, _ in profile:
        rows.append([bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), z)) for i in range(segs)])
    for j in range(len(profile) - 1):
        rid = profile[j][2]
        val = ring_rand.setdefault(rid, rnd.random())
        zmid = (profile[j][1] + profile[j + 1][1]) / 2
        for i in range(segs):
            a, b2 = i, (i + 1) % segs
            f = bm.faces.new((rows[j][a], rows[j][b2], rows[j + 1][b2], rows[j + 1][a]))
            f[rr] = val
            ang = 2 * math.pi * (i + 0.5) / segs
            if tile_test and tile_test(ang, zmid):
                f.material_index = 1
            # UVs in metres so the tile pattern has a real size
            for loop, (ii, jj) in zip(f.loops, ((a, j), (i + 1, j), (i + 1, j + 1), (a, j + 1))):
                loop[uv].uv = (ii / segs * 2 * math.pi * R, profile[jj][1])
    return obj(name, bm, None, smooth=True, mats=mats)


def ringed_profile(z0, z1, radius_at, rid0=0):
    """Profile with a raised weld bead at every ring joint."""
    pts, z, rid = [], z0, rid0
    while z < z1 - 1e-6:
        top = min(z + RING, z1)
        r0, r1 = radius_at(z), radius_at(top)
        pts += [(r0, z + 0.02, rid), (r1, top - 0.04, rid), (r1 + 0.014, top - 0.01, rid)]
        z, rid = top, rid + 1
    pts.insert(0, (radius_at(z0), z0, rid0))
    pts.append((radius_at(z1), z1, rid - 1))
    return pts


def build_stack(M):
    base = PAD_H
    hsr = 2.4  # hot-staging ring height
    # ---- booster skin
    prof = [(r, z + base, i) for r, z, i in ringed_profile(0.0, BOOSTER_H - hsr, lambda z: R)]
    shell("booster", prof, [M["booster"]])
    bm = bmesh.new()
    # stringers on the aft skirt
    for i in range(72):
        a = 2 * math.pi * i / 72
        beam(bm, V(math.cos(a) * (R + 0.05), math.sin(a) * (R + 0.05), base + 0.3), V(math.cos(a) * (R + 0.05), math.sin(a) * (R + 0.05), base + 7.2), 0.1, 0.12, roll=a)
    obj("stringers", bm, M["booster"], bevel=0.01)
    bm = bmesh.new()
    # chines: four long raised covers
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        c, s = math.cos(a), math.sin(a)
        beam(bm, V(c * (R + 0.32), s * (R + 0.32), base + 2.5), V(c * (R + 0.32), s * (R + 0.32), base + 25.5), 1.25, 0.7, roll=a + math.pi / 2)
        beam(bm, V(c * (R + 0.2), s * (R + 0.2), base + 25.5), V(c * (R - 0.1), s * (R - 0.1), base + 28.5), 1.25, 0.5, roll=a + math.pi / 2)
    # raceway up the tower side
    beam(bm, V(-(R + 0.18), 0.9, base + 8), V(-(R + 0.18), 0.9, base + BOOSTER_H - 6), 0.5, 0.3)
    obj("chines", bm, M["dark"], bevel=0.12)
    # ---- grid fins: real lattice, three of them, none on the tower side
    for k, a in enumerate((0.0, math.pi / 2, -math.pi / 2)):
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=11, y_segments=8, size=0.5)
        fin = obj("gridfin%d" % k, bm, M["dark"])
        fin.scale = (6.8, 5.2, 1)
        fin.rotation_euler = (0, 0, a)
        fin.location = (math.cos(a) * (R + 3.6), math.sin(a) * (R + 3.6), base + BOOSTER_H - 9.0)
        w = fin.modifiers.new("lattice", "WIREFRAME")
        w.thickness = 0.5
        w.use_replace = True
        w.use_relative_offset = False
        bm = bmesh.new()
        c, s = math.cos(a), math.sin(a)
        tube(bm, V(c * (R - 0.2), s * (R - 0.2), base + BOOSTER_H - 9.0), V(c * (R + 0.6), s * (R + 0.6), base + BOOSTER_H - 9.0), 0.75, 16)
        obj("finroot%d" % k, bm, M["dark"])
    # ---- hot-staging ring: open truss over a dark dome
    bm = bmesh.new()
    z0, z1 = base + BOOSTER_H - hsr, base + BOOSTER_H
    n = 30
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 0.5) / n
        a2 = 2 * math.pi * (i + 1) / n
        p = lambda a, z: V(math.cos(a) * (R - 0.05), math.sin(a) * (R - 0.05), z)
        beam(bm, p(a0, z0), p(a1, z1), 0.22, 0.3)
        beam(bm, p(a1, z1), p(a2, z0), 0.22, 0.3)
    obj("hotstage", bm, M["booster"], bevel=0.02)
    bm = bmesh.new()
    tube(bm, V(0, 0, z0 - 0.3), V(0, 0, z0 + 0.25), R, 96)
    tube(bm, V(0, 0, z1 - 0.25), V(0, 0, z1 + 0.05), R, 96)
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=12, radius=R - 0.5, matrix=Matrix.Translation((0, 0, z0 - 1.6)) @ Matrix.Diagonal((1, 1, 0.75, 1)))
    obj("hotstage_rings", bm, M["dark"], smooth=True)

    # ---- ship
    sb = base + BOOSTER_H
    barrel = 33.0

    def rad(z):
        if z <= barrel:
            return R
        t = (z - barrel) / (SHIP_H - barrel)
        return max(R * (1 - t ** 2.1) ** 0.72, 0.06)

    prof = [(r, z + sb, i) for r, z, i in ringed_profile(0.0, SHIP_H, rad)]

    def windward(ang, z):
        d = math.atan2(math.sin(ang), math.cos(ang))  # angle from +X
        return abs(d) < math.radians(97)

    shell("ship", prof, [M["ship"], M["tiles"]], tile_test=windward)
    # flaps: hinged on the line between steel and tiles, swept a little leeward
    def flap(name, z0, span, height, taper, ang):
        bm = bmesh.new()
        pts = [(R - 0.25, 0.0), (R + span, height * 0.1), (R + span * taper, height), (R - 0.25, height)]
        vs0 = [bm.verts.new((x, -0.28, z)) for x, z in pts]
        vs1 = [bm.verts.new((x, 0.28, z)) for x, z in pts]
        bm.faces.new(vs0)
        bm.faces.new(reversed(vs1))
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((vs0[j], vs0[i], vs1[i], vs1[j]))
        # hinge fairing
        tube(bm, V(R + 0.05, 0, 0.3), V(R + 0.05, 0, height - 0.3), 0.5, 14)
        o = obj(name, bm, M["tiles_flat"], bevel=0.08)
        o.rotation_euler = (0, 0, ang)
        o.location = (0, 0, sb + z0)

    for sgn in (1, -1):
        flap("aftflap%d" % sgn, 1.0, 5.8, 13.5, 0.5, sgn * math.radians(100))
        flap("fwdflap%d" % sgn, 35.0, 4.1, 8.6, 0.32, sgn * math.radians(112))
    bm = bmesh.new()
    # leeward raceway, catch pins, vents
    beam(bm, V(-(R + 0.15), -0.8, sb + 1.5), V(-(R + 0.15), -0.8, sb + 31), 0.55, 0.28)
    for sgn in (1, -1):
        a = sgn * math.radians(150)
        tube(bm, V(math.cos(a) * (R - 1.3), math.sin(a) * (R - 1.3), sb + 38.5), V(math.cos(a) * (R + 0.2), math.sin(a) * (R + 0.2), sb + 38.5), 0.3, 12)
    obj("ship_bits", bm, M["dark"], bevel=0.05)


def build_tower(M):
    bm = bmesh.new()  # primary steel
    bs = bmesh.new()  # secondary: rails, stairs, pipes
    half = TW / 2
    corners = [V(TX - half, -half, 0), V(TX + half, -half, 0), V(TX + half, half, 0), V(TX - half, half, 0)]
    bay = 9.125
    levels = int(TOWER_H / bay)
    for c in corners:
        beam(bm, c, c + V(0, 0, TOWER_H), 1.9)
    for l in range(levels):
        z0, z1 = l * bay, (l + 1) * bay
        for s in range(4):
            a, b = corners[s], corners[(s + 1) % 4]
            n = (b - a).normalized()
            out = Vector((n.y, -n.x, 0))
            a0, b0, a1, b1 = a + V(0, 0, z0), b + V(0, 0, z0), a + V(0, 0, z1), b + V(0, 0, z1)
            beam(bm, a1, b1, 0.85, 0.6)
            if s == 1 and 4 <= l:  # the rocket-side face is left open for the carriage
                continue
            beam(bm, a0 + out * 0.2, b1 + out * 0.2, 0.5, 0.32)
            beam(bm, b0 - out * 0.2, a1 - out * 0.2, 0.5, 0.32)
            # gusset plates at the joints and where the braces cross
            ang = math.atan2(n.y, n.x)
            for p in (a0, b0, a1, b1):
                q = p + (((a + b) / 2 - Vector((p.x, p.y, 0))).normalized()) * 1.6
                slab(bm, V(q.x, q.y, p.z + (0.9 if p.z == z0 else -0.9)) + out * 0.0, 2.4, 0.07, 2.0, ang)
            mid = (a0 + b1) / 2
            slab(bm, mid, 1.9, 0.07, 1.9, ang)
    # carriage rails up the rocket-side face
    for y in (-half + 0.2, half - 0.2):
        beam(bs, V(TX + half + 1.05, y, 20), V(TX + half + 1.05, y, TOWER_H - 2), 0.5, 0.7)
    # lift and stair core inside
    for dx, dy in ((-2, -2), (2, -2), (2, 2), (-2, 2)):
        beam(bs, V(TX + dx, dy, 0), V(TX + dx, dy, TOWER_H), 0.3)
    for i in range(int(TOWER_H / 3)):
        z = i * 3.0
        beam(bs, V(TX - 2, -2, z), V(TX + 2, -2, z), 0.14)
        beam(bs, V(TX - 2, 2, z), V(TX + 2, 2, z), 0.14)
        # stair flights zig-zag between landings
        y0, y1 = (-1.6, 1.6) if i % 2 else (1.6, -1.6)
        for dx in (-3.6, -2.7):
            beam(bs, V(TX + dx, y0, z), V(TX + dx, y1, z + 3.0), 0.12, 0.3)
        tube(bs, V(TX - 3.75, y0, z + 1.0), V(TX - 3.75, y1, z + 4.0), 0.03, 6)
        slab(bs, V(TX - 3.15, y1, z + 3.0), 1.2, 1.2, 0.06)
    # work platforms with posts and rails on the two long sides
    for z in [18 + 18.25 * k for k in range(7)]:
        for sgn in (-1, 1):
            y = sgn * (half + 1.2)
            slab(bs, V(TX, y, z), TW + 3, 1.7, 0.12)
            for k in range(11):
                x = TX - half - 1.2 + k * (TW + 2.4) / 10
                tube(bs, V(x, y + sgn * 0.8, z), V(x, y + sgn * 0.8, z + 1.1), 0.03, 6)
            for h in (0.55, 1.1):
                tube(bs, V(TX - half - 1.2, y + sgn * 0.8, z + h), V(TX + half + 1.2, y + sgn * 0.8, z + h), 0.03, 6)
    obj("tower_secondary", bs, M["tower"], bevel=0.02)

    bp = bmesh.new()  # pipework and cables
    for i in range(9):
        x = TX - 4.4 + i * 1.05
        r = (0.26, 0.14, 0.2, 0.1, 0.3, 0.12, 0.18, 0.1, 0.22)[i]
        top = (PAD_H + BOOSTER_H + 9, 60, TOWER_H - 6, 40, PAD_H + BOOSTER_H + 9, TOWER_H - 6, 90, 110, 30)[i]
        tube(bp, V(x, -half - 0.75, 0.5), V(x, -half - 0.75, top), r, 10)
    for z in range(6, int(TOWER_H), 6):
        beam(bp, V(TX - 5, -half - 0.75, z), V(TX + 4.6, -half - 0.75, z), 0.12, 0.7)  # pipe clamps
    for x in (TX - 3, TX - 2.6, TX + 3):
        tube(bp, V(x, half + 0.5, 1), V(x, half + 0.5, TOWER_H - 12), 0.07, 6)
    obj("tower_pipes", bp, M["pipe"], smooth=True)

    # head house: clad box overhanging the rocket side, with panel joints
    hz, hh = TOWER_H, 12.0
    slab(bm, V(TX + 4.5, 0, hz + hh / 2), TW + 9.5, TW + 2.5, hh)
    obj("tower_primary", bm, M["tower"], bevel=0.05)
    bc = bmesh.new()
    for k in range(13):
        x = TX - half - 0.2 + k * (TW + 9.5) / 12
        for sgn in (-1, 1):
            beam(bc, V(x, sgn * (half + 1.3), hz + 0.3), V(x, sgn * (half + 1.3), hz + hh - 0.3), 0.12, 0.08)
    for k in range(9):
        y = -half - 1.2 + k * (TW + 2.4) / 8
        beam(bc, V(TX + half + 4.52, y, hz + 0.3), V(TX + half + 4.52, y, hz + hh - 0.3), 0.08, 0.12)
    for z in (hz + 4, hz + 8):
        for sgn in (-1, 1):
            beam(bc, V(TX - half - 0.2, sgn * (half + 1.3), z), V(TX + half + 4.5, sgn * (half + 1.3), z), 0.1, 0.08)
    # roof rail, lightning mast, hook block on four falls of cable
    for sgn in (-1, 1):
        tube(bc, V(TX - half, sgn * (half + 1.2), hz + hh + 1.1), V(TX + half + 4.5, sgn * (half + 1.2), hz + hh + 1.1), 0.035, 6)
    tube(bc, V(TX - 2, 0, hz + hh), V(TX - 2, 0, hz + hh + 16), 0.22, 8, r2=0.05)
    for dy in (-0.5, 0.5):
        for dx in (-0.3, 0.3):
            tube(bc, V(TX + half + 6.5 + dx, dy, hz), V(TX + half + 6.5 + dx, dy, hz - 24), 0.03, 6)
    slab(bc, V(TX + half + 6.5, 0, hz - 25.2), 1.3, 1.6, 2.4)
    obj("tower_head_trim", bc, M["dark"], bevel=0.02)

    # ---- carriage and catch arms
    arm_z = PAD_H + BOOSTER_H - 5.0
    ba = bmesh.new()
    xf = TX + half + 1.6
    for z in (arm_z - 6, arm_z + 3):
        beam(ba, V(xf, -half - 1, z), V(xf, half + 1, z), 2.0, 1.6)
    for y in (-half - 0.5, half + 0.5):
        beam(ba, V(xf, y, arm_z - 7), V(xf, y, arm_z + 4), 1.6, 1.2)
        beam(ba, V(xf, y, arm_z - 7), V(xf - 2.6, y, arm_z + 4), 0.5)
    for sgn in (-1, 1):
        root = V(xf + 0.8, sgn * 5.6, arm_z)
        tip = V(xf + 40.0, sgn * 8.4, arm_z)
        nseg = 9
        for off in (-1.15, 1.15):
            o = V(0, off, 0)
            tops = [root.lerp(tip, i / nseg) + V(0, 0, 2.0) + o for i in range(nseg + 1)]
            bots = [root.lerp(tip, i / nseg) + V(0, 0, 2.0 - (13.0 * (1 - i / nseg) ** 1.5 + 2.2)) + o for i in range(nseg + 1)]
            for i in range(nseg):
                beam(ba, tops[i], tops[i + 1], 0.7, 0.55)
                beam(ba, bots[i], bots[i + 1], 0.6, 0.5)
                beam(ba, tops[i], bots[i], 0.36)
                beam(ba, bots[i], tops[i + 1], 0.4, 0.3)
            beam(ba, tops[nseg], bots[nseg], 0.4)
        for i in range(nseg + 1):
            p = root.lerp(tip, i / nseg)
            drop = 13.0 * (1 - i / nseg) ** 1.5 + 2.2
            beam(ba, p + V(0, -1.15, 2.0), p + V(0, 1.15, 2.0), 0.3)
            beam(ba, p + V(0, -1.15, 2.0 - drop), p + V(0, 1.15, 2.0 - drop), 0.3)
            if i < nseg:
                q = root.lerp(tip, (i + 1) / nseg)
                beam(ba, p + V(0, -1.15, 2.0), q + V(0, 1.15, 2.0), 0.2)
        # landing rail along the inner top edge, and the actuator back to the carriage
        beam(ba, root.lerp(tip, 0.25) + V(0, -sgn * 1.2, 2.45), tip + V(0, -sgn * 1.2, 2.45), 0.5, 0.4)
        tube(ba, V(xf, sgn * (half + 0.4), arm_z - 2), root.lerp(tip, 0.22) + V(0, sgn * 1.0, 0.5), 0.3, 10)
    obj("catch_arms", ba, M["tower"], bevel=0.04)

    # ---- ship quick-disconnect arm with hoses
    bq = bmesh.new()
    zq = PAD_H + BOOSTER_H + 7.0
    x0, x1 = TX + half, -R - 0.4
    for dz in (-1.6, 1.6):
        for dy in (-3.4, -0.6):
            beam(bq, V(x0, dy, zq + dz), V(x1, dy, zq + dz), 0.42)
    for i in range(6):
        t0, t1 = i / 6, (i + 1) / 6
        for dy in (-3.4, -0.6):
            beam(bq, V(x0 + (x1 - x0) * t0, dy, zq - 1.6), V(x0 + (x1 - x0) * t1, dy, zq + 1.6), 0.24)
        beam(bq, V(x0 + (x1 - x0) * t0, -3.4, zq + 1.6), V(x0 + (x1 - x0) * t0, -0.6, zq + 1.6), 0.2)
    slab(bq, V(x1 + 0.2, -2.0, zq), 0.5, 3.4, 3.8)
    for k in range(4):
        prev = None
        for i in range(9):
            t = i / 8
            p = V(x0 + (x1 - x0) * t, -1.2 - k * 0.5, zq - 2.1 - math.sin(t * math.pi) * (1.6 + 0.35 * k))
            if prev is not None:
                tube(bq, prev, p, 0.11, 8)
            prev = p
    obj("ship_qd", bq, M["tower"], bevel=0.03)

    # work lights on the tower
    bl = bmesh.new()
    for z in range(22, int(TOWER_H), 18):
        slab(bl, V(TX - half - 0.2, -half - 1.1, z), 0.5, 0.25, 0.35)
        slab(bl, V(TX + half + 0.2, half + 1.1, z + 8), 0.5, 0.25, 0.35)
    obj("tower_lamps", bl, M["lamp"])
    br = bmesh.new()
    slab(br, V(TX - 2, 0, hz + hh + 16.2), 0.3, 0.3, 0.4)
    obj("beacon", br, M["beacon"])


def build_site(M):
    bm = bmesh.new()  # steel
    bc = bmesh.new()  # concrete
    # launch mount: thick steel deck with a ring of hold-down clamps, on concrete piers
    slab(bm, V(0, 0, PAD_H - 1.8), 30, 28, 3.6)
    tube(bm, V(0, 0, PAD_H - 0.2), V(0, 0, PAD_H + 0.5), R + 1.6, 64)
    for i in range(20):
        a = 2 * math.pi * i / 20
        slab(bm, V(math.cos(a) * (R + 1.0), math.sin(a) * (R + 1.0), PAD_H + 0.9), 1.5, 0.9, 1.3, a)
    for x in (-12.5, 12.5):
        for y in (-11.5, 0, 11.5):
            slab(bc, V(x, y, (PAD_H - 3.6) / 2), 4.2, 4.2, PAD_H - 3.6)
    slab(bc, V(0, 0, 0.5), 80, 64, 1.0)
    # flame diverter and trench walls
    for sgn in (-1, 1):
        slab(bc, V(0, sgn * 17, 2.2), 62, 2.2, 4.4)
    w = bc.verts
    # booster quick-disconnect hood and service structure on the deck
    slab(bm, V(-8.5, 0, PAD_H + 3.2), 5.5, 5.0, 6.4)
    beam(bm, V(-11, -2, PAD_H), V(-18, -2, PAD_H + 6), 0.6)
    # deck handrails and stairs
    for sgn in (-1, 1):
        tube(bm, V(-15, sgn * 14, PAD_H + 1.1), V(15, sgn * 14, PAD_H + 1.1), 0.035, 6)
        for k in range(13):
            tube(bm, V(-15 + k * 2.5, sgn * 14, PAD_H), V(-15 + k * 2.5, sgn * 14, PAD_H + 1.1), 0.035, 6)
    for i in range(16):
        slab(bm, V(15.6 + i * 0.6, -12.5, PAD_H - 0.4 - i * 0.7), 0.7, 2.2, 0.08)
    beam(bm, V(15.3, -13.6, PAD_H), V(25.2, -13.6, 0.8), 0.14, 0.4)
    beam(bm, V(15.3, -11.4, PAD_H), V(25.2, -11.4, 0.8), 0.14, 0.4)
    # water and propellant mains running from the mount toward the tank farm
    for k, r in enumerate((0.55, 0.4, 0.4, 0.3, 0.3)):
        y = 20 + k * 1.5
        tube(bm, V(14, y, 1.8), V(170, y + 30, 1.8), r, 12)
        for x in range(20, 170, 12):
            slab(bc, V(x, y + (x - 14) * 30 / 156, 0.8), 0.5, 1.2, 1.6)
        tube(bm, V(14, y, 1.8), V(14, y, PAD_H - 4), r, 12)
        tube(bm, V(14, y, PAD_H - 4), V(11, y * 0.5, PAD_H - 4), r, 12)
    # blast wall and low bunkers
    slab(bc, V(120, 96, 3.0), 150, 1.6, 6.0, 0.19)
    for x, y, sx, sy, sz in ((-70, 60, 22, 12, 5), (-95, 20, 14, 10, 4), (60, -70, 18, 9, 4.5), (-40, -78, 12, 8, 3.5)):
        slab(bc, V(x, y, sz / 2), sx, sy, sz)
    obj("mount_steel", bm, M["mount"], bevel=0.05)
    obj("concrete", bc, M["concrete"], bevel=0.06)

    # tank farm: tall vertical tanks with stiffener rings, ladders and top vents
    bt = bmesh.new()
    bd = bmesh.new()
    for i in range(8):
        x, y = 175 + (i % 4) * 16.5, 70 + (i // 4) * 20 + (i % 2) * 3
        h = (34, 40, 30, 38, 36, 30, 40, 34)[i]
        tube(bt, V(x, y, 1.2), V(x, y, h), 4.7, 48)
        bmesh.ops.create_uvsphere(bt, u_segments=48, v_segments=10, radius=4.7, matrix=Matrix.Translation((x, y, h)) @ Matrix.Diagonal((1, 1, 0.45, 1)))
        for z in range(4, h, 5):
            tube(bd, V(x, y, z - 0.08), V(x, y, z + 0.08), 4.78, 48)
        for dy in (-0.25, 0.25):
            tube(bd, V(x - 4.85, y + dy, 1), V(x - 4.85, y + dy, h + 1.5), 0.04, 6)
        tube(bd, V(x, y, h + 1.5), V(x, y, h + 5.5), 0.22, 8)
        tube(bd, V(x + 4.8, y, 2), V(x + 4.8, y, h - 2), 0.18, 8)
    for i in range(6):
        y = 52 - i * 6.5
        tube(bt, V(150, y, 3.6), V(182, y, 3.6), 2.3, 28)
        for x in (155, 177):
            slab(bd, V(x, y, 0.9), 1.0, 3.6, 1.8)
    obj("tanks", bt, M["tank"], smooth=True)
    obj("tank_details", bd, M["pipe"], smooth=True)

    # light masts with lamp racks
    bl = bmesh.new()
    bx = bmesh.new()
    for x, y in MASTS:
        tube(bx, V(x, y, 0), V(x, y, 45), 0.55, 10, r2=0.3)
        slab(bx, V(x, y, 45.9), 5.0, 0.4, 2.0, math.atan2(-y, -x) + math.pi / 2)
        for k in range(-2, 3):
            a = math.atan2(-y, -x) + math.pi / 2
            p = V(x + math.cos(a) * k * 0.95, y + math.sin(a) * k * 0.95, 45.9)
            d = (V(0, 0, 60) - p).normalized()
            slab(bl, p + d * 0.26, 0.7, 0.12, 0.7, a)
    obj("masts", bx, M["tower"])
    obj("mast_lamps", bl, M["lamp"])

    # vehicles and people, for scale
    bv = bmesh.new()
    bw = bmesh.new()
    for x, y, a in ((34, -34, 0.3), (-30, -40, 2.6), (58, -22, 1.2), (-52, -30, 0.1)):
        m = Matrix.Translation((x, y, 0)) @ Matrix.Rotation(a, 4, "Z")
        bmesh.ops.create_cube(bv, size=1.0, matrix=m @ Matrix.Translation((0, 0, 1.25)) @ Matrix.Diagonal((5.8, 2.0, 0.9, 1)))
        bmesh.ops.create_cube(bv, size=1.0, matrix=m @ Matrix.Translation((-0.5, 0, 2.05)) @ Matrix.Diagonal((2.3, 1.85, 0.8, 1)))
        for wx in (-1.9, 1.9):
            for wy in (-1.0, 1.0):
                bmesh.ops.create_cone(bw, cap_ends=True, segments=14, radius1=0.42, radius2=0.42, depth=0.3, matrix=m @ Matrix.Translation((wx, wy, 0.42)) @ Matrix.Rotation(math.pi / 2, 4, "X"))
    obj("trucks", bv, M["truck"], bevel=0.08)
    obj("wheels", bw, M["dark"])
    legs, vest, head = bmesh.new(), bmesh.new(), bmesh.new()
    for i in range(16):
        x, y = rnd.uniform(-45, 62), rnd.uniform(-44, -22)
        slab(legs, V(x, y, 1.0 + 0.43), 0.34, 0.24, 0.86)
        slab(vest, V(x, y, 1.0 + 1.18), 0.46, 0.27, 0.64)
        bmesh.ops.create_uvsphere(head, u_segments=8, v_segments=6, radius=0.13, matrix=Matrix.Translation((x, y, 1.0 + 1.64)))
    obj("legs", legs, M["dark"])
    obj("vests", vest, M["hivis"])
    obj("heads", head, M["hat"])

    # vapour: off the booster and ship vents, and pooling round the mount; wind toward +X
    for k, (c, sc) in enumerate(() if LIFTOFF else (
        (V(7, -1, PAD_H + 61), (13, 6, 4.5)),
        (V(5, 1, PAD_H + BOOSTER_H + 28), (9, 4.5, 3.2)),
        (V(12, -4, PAD_H + 1.5), (30, 20, 7.5)),
        (V(-14, 6, PAD_H - 3), (16, 14, 5)),
    )):
        bv2 = bmesh.new()
        bmesh.ops.create_uvsphere(bv2, u_segments=24, v_segments=12, radius=1.0)
        o = obj("vapour%d" % k, bv2, M["vapour"])
        o.location = c
        o.scale = sc
        o.rotation_euler = (0.1 * k, 0.15, 0.5 * k)

    # foreground scrub: low dark clumps between the camera and the pad
    bsc = bmesh.new()
    for i in range(2600):
        x, y = rnd.uniform(-260, 330), rnd.uniform(-330, -70)
        if abs(x) < 46 and y > -56:
            continue
        sz = rnd.uniform(0.25, 1.1)
        bmesh.ops.create_icosphere(bsc, subdivisions=1, radius=1.0, matrix=Matrix.Translation((x, y, sz * 0.3)) @ Matrix.Rotation(rnd.uniform(0, 3.1), 4, "Z") @ Matrix.Diagonal((sz * rnd.uniform(1.0, 2.6), sz, sz * rnd.uniform(0.5, 0.9), 1)))
    obj("scrub", bsc, M["scrub"])
    # access road and pad apron markings
    brd = bmesh.new()
    slab(brd, V(40, -190, 0.04), 9, 300, 0.08, 0.12)
    slab(brd, V(-120, -62, 0.04), 260, 8, 0.08, -0.05)
    obj("road", brd, M["road"])

    # ground: land this side, sea beyond the pad
    bg = bmesh.new()
    bmesh.ops.create_grid(bg, x_segments=1, y_segments=1, size=6000)
    obj("ground", bg, M["ground"])
    bs = bmesh.new()
    bmesh.ops.create_grid(bs, x_segments=1, y_segments=1, size=30000, matrix=Matrix.Translation((0, 30000 + 260, 0.4)))
    obj("sea", bs, M["sea"])


MASTS = [(78, -92), (-72, -84), (104, 70), (-88, 64)]

LIFTOFF = bool(os.environ.get("HERO_T") or os.environ.get("HERO_SEQ"))


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


class Launch:
    """Everything that changes with time after ignition."""

    def __init__(self, scene, M, stack_objs):
        self.scene = scene
        self.stack = [(o, o.location.z) for o in stack_objs]
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=1.0, radius2=0.42, depth=1.0)
        self.flame = obj("flame", bm, M["flame"])
        ld = bpy.data.lights.new("plume", "POINT")
        ld.color = (1.0, 0.7, 0.42)
        ld.shadow_soft_size = 7.0
        self.light = bpy.data.objects.new("plume", ld)
        scene.collection.objects.link(self.light)
        self.steam = []
        r2 = random.Random(3)
        for i in range(11):
            b = bmesh.new()
            bmesh.ops.create_uvsphere(b, u_segments=24, v_segments=12, radius=1.0)
            o = obj("steam%d" % i, b, M["steam"])
            a = 2 * math.pi * i / 10 + r2.uniform(-0.2, 0.2)
            self.steam.append((o, a, r2.uniform(0.75, 1.25), r2.uniform(0, 6.28), i == 10))
        self.cam = scene.camera
        self.cam_target_z = float(os.environ.get("HERO_TZ", 84))

    def set(self, t):
        # About 1.5 g of thrust: slow off the pad, then quickly away
        lift = 0.5 * 4.6 * max(t, 0.0) ** 2
        for o, z0 in self.stack:
            o.location.z = z0 + lift
        burn = smooth((t + 1.2) / 1.2)  # engines come up over the last second before release
        base = PAD_H + lift
        length = 30 + 62 * burn
        self.flame.scale = (R * (1.25 + 0.5 * burn), R * (1.25 + 0.5 * burn), length)
        self.flame.location = (0, 0, base - length / 2 + 0.5)
        self.flame.hide_render = burn <= 0.01
        self.light.location = (0, 0, max(base - 22, 6))
        self.light.data.energy = float(os.environ.get("HERO_PLUME", 2.2e8)) * burn
        grow = smooth((t + 1.2) / 6.5)
        for o, a, k, rot, centre in self.steam:
            if centre:
                o.location = (4, 0, 5 + 5 * grow)
                o.scale = (24 + 26 * grow, 22 + 24 * grow, 7 + 8 * grow)
            else:
                rr = (16 + 68 * grow) * k
                o.location = (math.cos(a) * rr * 1.25, math.sin(a) * rr, 4 + 8 * grow * k)
                o.scale = ((14 + 36 * grow) * k, (13 + 32 * grow) * k, (5 + 12 * grow) * k)
            o.rotation_euler = (0.2 * k, 0.1, rot + 0.25 * t)
            o.hide_render = burn <= 0.01
        # the camera stops down as the plume lights, and tilts up to follow
        self.scene.view_settings.exposure = float(os.environ.get("HERO_EXPOSURE", 0.75)) - 2.0 * burn
        target = V(float(os.environ.get("HERO_TX", -62)), 0, self.cam_target_z + lift * 0.8)
        self.cam.rotation_euler = (target - self.cam.location).to_track_quat("-Z", "Y").to_euler()
        return lift

# -------------------------------------------------------------------- scene


def setup(scene):
    w = int(os.environ.get("HERO_W", 960))
    h = int(os.environ.get("HERO_H", 540))
    spp = int(os.environ.get("HERO_SPP", 48))
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = spp
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.03
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 6
    # Volumes are the slow part on a CPU: single scattering and coarser steps for the launch frames
    scene.cycles.volume_bounces = 0 if LIFTOFF else 1
    scene.cycles.volume_step_rate = 4.0 if LIFTOFF else 1.0
    scene.cycles.volume_max_steps = 128
    scene.cycles.sample_clamp_indirect = 8.0
    scene.render.resolution_x, scene.render.resolution_y = w, h
    scene.render.resolution_percentage = 100
    scene.render.threads_mode = "AUTO"
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception as e:
        log("look not set:", e)
    scene.view_settings.exposure = float(os.environ.get("HERO_EXPOSURE", 0.75))

    # world: the same Poly Haven dusk sky as the live scene, at 4k
    world = bpy.data.worlds.new("dusk")
    scene.world = world
    try:
        world.use_nodes = True
    except Exception:
        pass
    nt = world.node_tree
    bg = next(n for n in nt.nodes if n.type == "BACKGROUND")
    env = N(nt, "ShaderNodeTexEnvironment")
    hdr = os.path.join(HERE, "assets", "industrial_sunset_puresky_4k.hdr")
    if not os.path.exists(hdr):
        hdr = os.path.join(HERE, "..", "public", "hdri", "industrial_sunset_puresky_1k.hdr")
    env.image = bpy.data.images.load(hdr)
    co = N(nt, "ShaderNodeTexCoord")
    mp = N(nt, "ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(float(os.environ.get("HERO_SKY", 200))))
    L(nt, co.outputs["Generated"], mp.inputs["Vector"])
    L(nt, mp.outputs["Vector"], env.inputs["Vector"])
    L(nt, env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = float(os.environ.get("HERO_SKY_STRENGTH", 0.35))

    # floodlights from the masts
    power = float(os.environ.get("HERO_FLOOD", 1.6e6))
    for i, (x, y) in enumerate(MASTS):
        ld = bpy.data.lights.new("flood%d" % i, "SPOT")
        ld.energy = power
        ld.spot_size = math.radians(46)
        ld.spot_blend = 0.6
        ld.shadow_soft_size = 0.8
        ld.color = (0.86, 0.92, 1.0)
        lo = bpy.data.objects.new("flood%d" % i, ld)
        lo.location = (x, y, 45.9)
        aim = V(-6, 0, PAD_H + (STACK_H * 0.72 if i % 2 else STACK_H * 0.32))
        lo.rotation_euler = (aim - lo.location).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(lo)

    # drone camera: a few hundred metres out, stack and tower filling the frame
    cd = bpy.data.cameras.new("drone")
    cd.sensor_width = 36.0
    cd.lens = float(os.environ.get("HERO_LENS", 42.0))
    cd.clip_start, cd.clip_end = 1.0, 100000.0
    cam = bpy.data.objects.new("drone", cd)
    cam.location = (float(os.environ.get("HERO_CX", 170)), float(os.environ.get("HERO_CY", -330)), float(os.environ.get("HERO_CZ", 36)))
    target = V(float(os.environ.get("HERO_TX", -62)), 0, float(os.environ.get("HERO_TZ", 84)))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(cam)
    scene.camera = cam
    json.dump(
        {"position": list(cam.location), "target": list(target), "lensMm": cd.lens, "sensorWidthMm": 36.0, "width": w, "height": h, "note": "Blender Z-up, metres, pad centre at origin"},
        open(os.path.join(OUT, NAME + "_camera.json"), "w"),
        indent=2,
    )


def main():
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    M = {
        "booster": mat_steel("steel_booster", [(PAD_H + 5.0, PAD_H + 27.0), (PAD_H + 29.5, PAD_H + 62.5)], soot_to=PAD_H + 4.5),
        "ship": mat_steel("steel_ship", [(PAD_H + BOOSTER_H + 3.5, PAD_H + BOOSTER_H + 15.0), (PAD_H + BOOSTER_H + 17.0, PAD_H + BOOSTER_H + 29.0)]),
        "tiles": mat_tiles(),
        "tiles_flat": mat_paint("tiles_flat", (0.016, 0.016, 0.018), rough=0.5, grime=0.2),
        "dark": mat_paint("dark_steel", (0.05, 0.052, 0.056), rough=0.5, metal=0.8, grime=0.4),
        "tower": mat_paint("tower_steel", (0.085, 0.088, 0.094), rough=0.55, metal=0.35, grime=0.7),
        "mount": mat_paint("mount_steel", (0.07, 0.07, 0.072), rough=0.6, metal=0.5, grime=0.9),
        "pipe": mat_paint("pipe", (0.42, 0.43, 0.44), rough=0.4, metal=0.9, grime=0.5),
        "tank": mat_paint("tank_white", (0.62, 0.63, 0.63), rough=0.45, grime=0.6),
        "concrete": mat_paint("concrete", (0.22, 0.21, 0.2), rough=0.9, grime=0.8),
        "truck": mat_plain("truck", (0.6, 0.6, 0.58), rough=0.35),
        "hivis": mat_plain("hivis", (0.75, 0.9, 0.08), rough=0.7, emit=0.15),
        "hat": mat_plain("hat", (0.8, 0.8, 0.78), rough=0.4),
        "lamp": mat_plain("lamp", (1.0, 0.93, 0.82), emit=float(os.environ.get("HERO_LAMP", 160.0))),
        "beacon": mat_plain("beacon", (1.0, 0.08, 0.04), emit=600.0),
        "vapour": mat_vapour(float(os.environ.get("HERO_VAPOUR", 0.05))),
        "steam": mat_vapour(float(os.environ.get("HERO_STEAM", 0.55)), scale=3.4, cut=0.5, name="steam"),
        "flame": mat_flame(),
        "scrub": mat_paint("scrub", (0.03, 0.04, 0.018), rough=0.95, grime=0.3),
        "road": mat_paint("road", (0.05, 0.05, 0.052), rough=0.8, grime=0.2),
        "ground": mat_ground(),
        "sea": mat_sea(),
    }
    build_stack(M)
    stack_objs = list(scene.objects)
    log("stack built", round(time.time() - t0, 1))
    build_tower(M)
    log("tower built", round(time.time() - t0, 1))
    build_site(M)
    log("site built", round(time.time() - t0, 1))
    setup(scene)
    tris = sum(len(o.data.polygons) for o in scene.objects if o.type == "MESH")
    log("faces before modifiers:", tris)
    if os.environ.get("HERO_SAVE_BLEND"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, NAME + ".blend"))
    scene.render.image_settings.file_format = "PNG"
    if LIFTOFF:
        launch = Launch(scene, M, stack_objs)
        if os.environ.get("HERO_SEQ"):
            a, b, n = os.environ["HERO_SEQ"].split(",")
            a, b, n = float(a), float(b), int(n)
            frames = [(i, a + (b - a) * i / (n - 1)) for i in range(n)]
        else:
            frames = [(None, float(os.environ["HERO_T"]))]
        for i, t in frames:
            if i is not None:
                path = os.path.join(OUT, "%s_%03d.png" % (NAME, i))
                if os.path.exists(path):  # lets an interrupted sequence resume
                    continue
            else:
                path = os.path.join(OUT, NAME + ".png")
            lift = launch.set(t)
            scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            log("frame", i, "t=%.2f" % t, "lift=%.1f" % lift, "at", round(time.time() - t0, 1), "s")
    else:
        scene.render.filepath = os.path.join(OUT, NAME + ".png")
        bpy.ops.render.render(write_still=True)
    log("rendered", scene.render.resolution_x, "x", scene.render.resolution_y, "in", round(time.time() - t0, 1), "s")


try:
    main()
    open(DONE, "w").write("ok")
except Exception:
    log(traceback.format_exc())
    open(DONE, "w").write("error")
