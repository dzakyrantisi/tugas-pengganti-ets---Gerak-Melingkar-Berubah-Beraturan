"use strict";

var gl;
var points = [];
var colors = [];
var texcoords = [];
var meshes = {};

var vBuffer, cBuffer, tBuffer;
var vPositionLoc, vColorLoc, vTexCoordLoc;
var modelViewMatrixLoc, projectionMatrixLoc;
var ambientColorLoc, diffuseColorLoc, specularColorLoc, lightPosLoc;
var useTextureLoc;

var camX = 0.0, camY = 0.6, camZ = 6.5;

var ambientColor = [0.35, 0.35, 0.35];
var diffuseColor = [0.75, 0.75, 0.75];
var specularColor = [1.0, 1.0, 1.0];
var lightPos = [3.0, 4.0, 4.0];

var tx = 0.0, ty = -0.2, tz = -7.0;
var rx = 0.0, ry = 0.0, rz = 0.0;
var scaleVal = 1.0;

var omega0 = 6.0;
var alpha = 0.8;
var radius = 0.7;
var timeParam = 0.0;
var autoTime = true;
var timeSliderMax = 25.0;
var lastTimestamp = null;

var physics = { theta: 0.0, omega: 0.0, linear: 0.0, tangential: 0.0 };
var staticMeshes = [];
var wireMeshes = [];
var bladeBaseAngles = [0, 120, 240];
var bladeTiltDeg = -12;
var bladeMeshName = "fanBlade";
var fanHubY = 0.82;
var headOffsetZ = 0.62;

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
        alert("WebGL tidak tersedia");
        return;
    }

    createFan();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.94, 0.96, 0.98, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vBuffer = gl.createBuffer();
    cBuffer = gl.createBuffer();
    tBuffer = gl.createBuffer();

    vPositionLoc = gl.getAttribLocation(program, "vPosition");
    vColorLoc = gl.getAttribLocation(program, "vColor");
    vTexCoordLoc = gl.getAttribLocation(program, "vTexCoord");

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    ambientColorLoc = gl.getUniformLocation(program, "ambientColor");
    diffuseColorLoc = gl.getUniformLocation(program, "diffuseColor");
    specularColorLoc = gl.getUniformLocation(program, "specularColor");
    lightPosLoc = gl.getUniformLocation(program, "lightPos");
    useTextureLoc = gl.getUniformLocation(program, "useTexture");

    function updateBuffers() {
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(texcoords), gl.STATIC_DRAW);
    }

    window.updateBuffers = updateBuffers;
    window.rebuildFan = function () {
        createFan();
        updateBuffers();
    };

    document.getElementById("rotateX").addEventListener("input", function (e) {
        rx = parseFloat(e.target.value);
    });
    document.getElementById("rotateY").addEventListener("input", function (e) {
        ry = parseFloat(e.target.value);
    });
    document.getElementById("rotateZ").addEventListener("input", function (e) {
        rz = parseFloat(e.target.value);
    });
    document.getElementById("transX").addEventListener("input", function (e) {
        tx = parseFloat(e.target.value);
    });
    document.getElementById("transY").addEventListener("input", function (e) {
        ty = parseFloat(e.target.value);
    });
    document.getElementById("transZ").addEventListener("input", function (e) {
        tz = parseFloat(e.target.value);
    });
    document.getElementById("scale").addEventListener("input", function (e) {
        scaleVal = parseFloat(e.target.value);
    });

    document.getElementById("camX").addEventListener("input", function (e) {
        camX = parseFloat(e.target.value);
    });
    document.getElementById("camY").addEventListener("input", function (e) {
        camY = parseFloat(e.target.value);
    });
    document.getElementById("camZ").addEventListener("input", function (e) {
        camZ = parseFloat(e.target.value);
    });

    document.getElementById("ambientColor").addEventListener("input", function (e) {
        ambientColor = hexToRgb01(e.target.value);
    });
    document.getElementById("diffuseColor").addEventListener("input", function (e) {
        diffuseColor = hexToRgb01(e.target.value);
    });
    document.getElementById("specularColor").addEventListener("input", function (e) {
        specularColor = hexToRgb01(e.target.value);
    });
    document.getElementById("lightX").addEventListener("input", function (e) {
        lightPos[0] = parseFloat(e.target.value);
    });
    document.getElementById("lightY").addEventListener("input", function (e) {
        lightPos[1] = parseFloat(e.target.value);
    });
    document.getElementById("lightZ").addEventListener("input", function (e) {
        lightPos[2] = parseFloat(e.target.value);
    });

    document.getElementById("omega0Input").addEventListener("input", function (e) {
        omega0 = parseFloat(e.target.value);
        document.getElementById("omega0Value").textContent = formatNumber(omega0);
        updatePhysicsDisplay();
    });

    document.getElementById("alphaInput").addEventListener("input", function (e) {
        alpha = parseFloat(e.target.value);
        document.getElementById("alphaValue").textContent = formatNumber(alpha);
        updatePhysicsDisplay();
    });

    document.getElementById("radiusInput").addEventListener("input", function (e) {
        radius = parseFloat(e.target.value);
        document.getElementById("radiusValue").textContent = formatNumber(radius);
        updatePhysicsDisplay();
    });

    var timeSlider = document.getElementById("timeInput");
    timeSlider.addEventListener("input", function (e) {
        timeParam = parseFloat(e.target.value);
        document.getElementById("timeValue").textContent = formatNumber(timeParam);
        autoTime = false;
        document.getElementById("autoTimeToggle").checked = false;
        lastTimestamp = null;
        updatePhysicsDisplay();
    });

    document.getElementById("autoTimeToggle").addEventListener("change", function (e) {
        autoTime = e.target.checked;
        if (autoTime) {
            lastTimestamp = null;
        }
    });

    document.getElementById("resetTimeBtn").addEventListener("click", function () {
        timeParam = 0.0;
        timeSlider.value = timeParam;
        document.getElementById("timeValue").textContent = formatNumber(timeParam);
        updatePhysicsDisplay();
    });

    document.getElementById("resetBtn").addEventListener("click", resetScene);

    updateBuffers();
    updatePhysicsDisplay();
    requestAnimationFrame(render);
};

function resetScene() {
    tx = 0.0; ty = -0.2; tz = -7.0;
    rx = 0.0; ry = 0.0; rz = 0.0;
    scaleVal = 1.0;
    camX = 0.0; camY = 0.6; camZ = 6.5;
    ambientColor = [0.35, 0.35, 0.35];
    diffuseColor = [0.75, 0.75, 0.75];
    specularColor = [1.0, 1.0, 1.0];
    lightPos = [3.0, 4.0, 4.0];

    omega0 = 6.0;
    alpha = 0.8;
    radius = 0.7;
    timeParam = 0.0;
    autoTime = true;
    lastTimestamp = null;

    document.getElementById("rotateX").value = rx;
    document.getElementById("rotateY").value = ry;
    document.getElementById("rotateZ").value = rz;
    document.getElementById("transX").value = tx;
    document.getElementById("transY").value = ty;
    document.getElementById("transZ").value = tz;
    document.getElementById("scale").value = scaleVal;
    document.getElementById("camX").value = camX;
    document.getElementById("camY").value = camY;
    document.getElementById("camZ").value = camZ;
    document.getElementById("ambientColor").value = "#595959";
    document.getElementById("diffuseColor").value = "#bfbfbf";
    document.getElementById("specularColor").value = "#ffffff";
    document.getElementById("lightX").value = lightPos[0];
    document.getElementById("lightY").value = lightPos[1];
    document.getElementById("lightZ").value = lightPos[2];

    document.getElementById("omega0Input").value = omega0;
    document.getElementById("alphaInput").value = alpha;
    document.getElementById("radiusInput").value = radius;
    document.getElementById("timeInput").value = timeParam;
    document.getElementById("autoTimeToggle").checked = autoTime;

    document.getElementById("omega0Value").textContent = formatNumber(omega0);
    document.getElementById("alphaValue").textContent = formatNumber(alpha);
    document.getElementById("radiusValue").textContent = formatNumber(radius);
    document.getElementById("timeValue").textContent = formatNumber(timeParam);

    updatePhysicsDisplay();
}

function formatNumber(val) {
    return val.toFixed(2);
}

function hexToRgb01(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var bigint = parseInt(hex, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    return [r / 255, g / 255, b / 255];
}

function pushVertex(position, color, uv) {
    points.push(position);
    colors.push(color);
    texcoords.push(uv || vec2(0.0, 0.0));
}

function addTriangle(a, b, c, color) {
    pushVertex(a, color);
    pushVertex(b, color);
    pushVertex(c, color);
}

function addQuad(a, b, c, d, color) {
    addTriangle(a, b, c, color);
    addTriangle(a, c, d, color);
}

function createCylinderY(name, cx, cy, cz, topRx, topRz, bottomRx, bottomRz, height, segments, color) {
    var start = points.length;
    var y0 = cy - height / 2.0;
    var y1 = cy + height / 2.0;
    segments = segments || 48;

    var topCenter = vec4(cx, y1, cz, 1.0);
    var bottomCenter = vec4(cx, y0, cz, 1.0);

    for (var i = 0; i < segments; i++) {
        var a0 = (i / segments) * Math.PI * 2.0;
        var a1 = ((i + 1) / segments) * Math.PI * 2.0;

        var topA = vec4(cx + topRx * Math.cos(a0), y1, cz + topRz * Math.sin(a0), 1.0);
        var topB = vec4(cx + topRx * Math.cos(a1), y1, cz + topRz * Math.sin(a1), 1.0);
        var bottomA = vec4(cx + bottomRx * Math.cos(a0), y0, cz + bottomRz * Math.sin(a0), 1.0);
        var bottomB = vec4(cx + bottomRx * Math.cos(a1), y0, cz + bottomRz * Math.sin(a1), 1.0);

        addQuad(bottomA, bottomB, topB, topA, color);
        addTriangle(bottomCenter, bottomA, bottomB, color);
        addTriangle(topCenter, topB, topA, color);
    }

    meshes[name] = { start: start, count: points.length - start, center: vec3(cx, cy, cz) };
    staticMeshes.push(name);
}

function createRing(name, cx, cy, cz, innerRadius, outerRadius, thickness, segments, color) {
    var start = points.length;
    var zFront = cz + thickness / 2.0;
    var zBack = cz - thickness / 2.0;
    segments = segments || 64;

    for (var i = 0; i < segments; i++) {
        var a0 = (i / segments) * Math.PI * 2.0;
        var a1 = ((i + 1) / segments) * Math.PI * 2.0;

        var outer0Front = vec4(cx + outerRadius * Math.cos(a0), cy + outerRadius * Math.sin(a0), zFront, 1.0);
        var outer1Front = vec4(cx + outerRadius * Math.cos(a1), cy + outerRadius * Math.sin(a1), zFront, 1.0);
        var inner0Front = vec4(cx + innerRadius * Math.cos(a0), cy + innerRadius * Math.sin(a0), zFront, 1.0);
        var inner1Front = vec4(cx + innerRadius * Math.cos(a1), cy + innerRadius * Math.sin(a1), zFront, 1.0);

        var outer0Back = vec4(cx + outerRadius * Math.cos(a0), cy + outerRadius * Math.sin(a0), zBack, 1.0);
        var outer1Back = vec4(cx + outerRadius * Math.cos(a1), cy + outerRadius * Math.sin(a1), zBack, 1.0);
        var inner0Back = vec4(cx + innerRadius * Math.cos(a0), cy + innerRadius * Math.sin(a0), zBack, 1.0);
        var inner1Back = vec4(cx + innerRadius * Math.cos(a1), cy + innerRadius * Math.sin(a1), zBack, 1.0);

        addQuad(inner0Front, outer0Front, outer1Front, inner1Front, color);
        addQuad(inner1Back, outer1Back, outer0Back, inner0Back, color);
        addQuad(outer0Front, outer1Front, outer1Back, outer0Back, color);
        addQuad(inner1Front, inner0Front, inner0Back, inner1Back, color);
    }

    meshes[name] = { start: start, count: points.length - start, center: vec3(cx, cy, cz) };
    staticMeshes.push(name);
}

function createExtrudedPolygon(name, points2d, thickness, color, skipStaticRegister, offset) {
    var start = points.length;
    var half = thickness / 2.0;
    var zTop = half;
    var zBottom = -half;
    offset = offset || vec3(0.0, 0.0, 0.0);
    var ox = offset[0], oy = offset[1], oz = offset[2];

    for (var i = 1; i < points2d.length - 1; i++) {
        var p0 = points2d[0];
        var p1 = points2d[i];
        var p2 = points2d[i + 1];
        addTriangle(
            vec4(p0[0] + ox, p0[1] + oy, zBottom + oz, 1.0),
            vec4(p1[0] + ox, p1[1] + oy, zBottom + oz, 1.0),
            vec4(p2[0] + ox, p2[1] + oy, zBottom + oz, 1.0),
            color
        );
        addTriangle(
            vec4(p0[0] + ox, p0[1] + oy, zTop + oz, 1.0),
            vec4(p2[0] + ox, p2[1] + oy, zTop + oz, 1.0),
            vec4(p1[0] + ox, p1[1] + oy, zTop + oz, 1.0),
            color
        );
    }

    for (var k = 0; k < points2d.length; k++) {
        var next = (k + 1) % points2d.length;
        var a = points2d[k];
        var b = points2d[next];
        addQuad(
            vec4(a[0] + ox, a[1] + oy, zBottom + oz, 1.0),
            vec4(b[0] + ox, b[1] + oy, zBottom + oz, 1.0),
            vec4(b[0] + ox, b[1] + oy, zTop + oz, 1.0),
            vec4(a[0] + ox, a[1] + oy, zTop + oz, 1.0),
            color
        );
    }

    meshes[name] = { start: start, count: points.length - start, center: vec3(0.0, 0.0, 0.0) };
    if (!skipStaticRegister) {
        staticMeshes.push(name);
    }
}

function createBox(name, cx, cy, cz, sizeX, sizeY, sizeZ, color) {
    var start = points.length;
    var hx = sizeX / 2.0;
    var hy = sizeY / 2.0;
    var hz = sizeZ / 2.0;

    var x0 = cx - hx, x1 = cx + hx;
    var y0 = cy - hy, y1 = cy + hy;
    var z0 = cz - hz, z1 = cz + hz;

    var a = vec4(x0, y0, z0, 1.0);
    var b = vec4(x1, y0, z0, 1.0);
    var c = vec4(x1, y1, z0, 1.0);
    var d = vec4(x0, y1, z0, 1.0);
    var e = vec4(x0, y0, z1, 1.0);
    var f = vec4(x1, y0, z1, 1.0);
    var g = vec4(x1, y1, z1, 1.0);
    var h = vec4(x0, y1, z1, 1.0);

    addQuad(a, b, f, e, color); // bottom
    addQuad(d, c, g, h, color); // top
    addQuad(e, f, g, h, color); // front (z1)
    addQuad(a, d, h, e, color); // left (x0)
    addQuad(b, c, g, f, color); // right (x1)
    addQuad(a, b, c, d, color); // back (z0)

    meshes[name] = { start: start, count: points.length - start, center: vec3(cx, cy, cz) };
    staticMeshes.push(name);
}

function createRotatedBeam(name, cx, cy, cz, length, thickness, depth, angleDeg, color) {
    var start = points.length;
    var halfL = length / 2.0;
    var halfT = thickness / 2.0;
    var halfD = depth / 2.0;
    var rad = radians(angleDeg);
    var cosA = Math.cos(rad);
    var sinA = Math.sin(rad);

    function transformVertex(x, y, z) {
        var rx = x * cosA - y * sinA;
        var ry = x * sinA + y * cosA;
        return vec4(cx + rx, cy + ry, cz + z, 1.0);
    }

    var vertices = [
        transformVertex(-halfL, -halfT, -halfD),
        transformVertex(halfL, -halfT, -halfD),
        transformVertex(halfL, halfT, -halfD),
        transformVertex(-halfL, halfT, -halfD),
        transformVertex(-halfL, -halfT, halfD),
        transformVertex(halfL, -halfT, halfD),
        transformVertex(halfL, halfT, halfD),
        transformVertex(-halfL, halfT, halfD)
    ];

    addQuad(vertices[0], vertices[1], vertices[2], vertices[3], color);
    addQuad(vertices[4], vertices[7], vertices[6], vertices[5], color);
    addQuad(vertices[0], vertices[4], vertices[5], vertices[1], color);
    addQuad(vertices[1], vertices[5], vertices[6], vertices[2], color);
    addQuad(vertices[2], vertices[6], vertices[7], vertices[3], color);
    addQuad(vertices[3], vertices[7], vertices[4], vertices[0], color);

    meshes[name] = { start: start, count: points.length - start, center: vec3(cx, cy, cz) };
    staticMeshes.push(name);
}

function createRadialWire(name, angleDeg, innerRadius, outerRadius, width, thickness, color) {
    var ang = radians(angleDeg);
    var dirX = Math.cos(ang);
    var dirY = Math.sin(ang);
    var perpX = -dirY;
    var perpY = dirX;
    var halfW = width / 2.0;
    var offsetY = fanHubY;

    var p0 = vec2(innerRadius * dirX + perpX * halfW, offsetY + innerRadius * dirY + perpY * halfW);
    var p1 = vec2(outerRadius * dirX + perpX * halfW * 0.4, offsetY + outerRadius * dirY + perpY * halfW * 0.4);
    var p2 = vec2(outerRadius * dirX - perpX * halfW * 0.4, offsetY + outerRadius * dirY - perpY * halfW * 0.4);
    var p3 = vec2(innerRadius * dirX - perpX * halfW, offsetY + innerRadius * dirY - perpY * halfW);

    createExtrudedPolygon(name, [p0, p1, p2, p3], thickness, color, true, vec3(0.0, 0.0, headOffsetZ));
    wireMeshes.push(name);
}

function createFan() {
    points.length = 0;
    colors.length = 0;
    texcoords.length = 0;
    meshes = {};
    staticMeshes = [];
    wireMeshes = [];

    var silver = vec4(0.68, 0.68, 0.7, 1.0);
    var lightGray = vec4(0.82, 0.82, 0.84, 1.0);
    var darkGray = vec4(0.3, 0.3, 0.32, 1.0);
    var accent = vec4(0.88, 0.88, 0.9, 1.0);
    var warmGray = vec4(0.55, 0.55, 0.57, 1.0);
    var bladeBlue = vec4(0.18, 0.42, 0.82, 1.0);

    createCylinderY("baseDisk", 0.0, -1.58, 0.0, 1.05, 1.05, 1.22, 1.22, 0.2, 72, silver);
    createCylinderY("baseLip", 0.0, -1.49, 0.0, 0.82, 0.82, 0.98, 0.98, 0.12, 64, accent);
    createCylinderY("baseCore", 0.0, -1.12, 0.0, 0.22, 0.22, 0.28, 0.28, 0.64, 48, silver);

    createBox("standLower", 0.0, -0.78, 0.08, 0.34, 0.88, 0.28, warmGray);
    createBox("standInset", 0.0, -0.78, 0.11, 0.22, 0.72, 0.18, darkGray);
    createBox("standConnector", 0.0, -0.22, 0.12, 0.24, 0.26, 0.2, warmGray);

    createBox("controlPanel", 0.0, -0.94, 0.22, 0.18, 0.3, 0.08, darkGray);
    for (var b = 0; b < 4; b++) {
        var buttonY = -0.88 + b * 0.1;
        createBox("controlButton" + b, 0.06, buttonY, 0.27, 0.05, 0.08, 0.04, accent);
    }

    createBox("neckBracket", 0.0, 0.05, 0.16, 0.32, 0.3, 0.28, silver);
    createCylinderY("neckPivot", 0.0, 0.18, 0.32, 0.2, 0.2, 0.2, 0.2, 0.16, 48, darkGray);

    var bracketShape = [
        vec2(-0.09, 0.18),
        vec2(0.11, 0.18),
        vec2(0.2, 0.62),
        vec2(0.01, 0.62)
    ];
    createExtrudedPolygon("tiltBracket", bracketShape, 0.16, silver, false, vec3(0.0, 0.0, 0.28));

    var armDepth = headOffsetZ - 0.18;
    var armCenterZ = 0.18 + armDepth / 2.0;
    createBox("supportArm", 0.0, 0.72, armCenterZ, 0.16, 0.14, armDepth, silver);
    createBox("armCollar", 0.0, 0.6, 0.26, 0.2, 0.18, 0.24, darkGray);
    createCylinderY("armPivot", 0.0, 0.62, 0.36, 0.11, 0.11, 0.11, 0.11, 0.14, 48, darkGray);

    var housingDepth = 0.46;
    var housingCenterZ = headOffsetZ - 0.23;
    createBox("motorHousing", 0.0, fanHubY, housingCenterZ, 0.62, 0.36, housingDepth, lightGray);
    createBox("motorBack", 0.0, fanHubY, housingCenterZ - housingDepth / 2.0 + 0.06, 0.56, 0.32, 0.18, darkGray);
    createCylinderY("topHandle", -0.22, fanHubY + 0.28, housingCenterZ + housingDepth / 2.0 - 0.12, 0.05, 0.05, 0.07, 0.07, 0.32, silver);

    createCylinderY("hub", 0.0, fanHubY, headOffsetZ, 0.12, 0.12, 0.12, 0.12, 0.28, 48, darkGray);
    createCylinderY("hubCap", 0.0, fanHubY, headOffsetZ + 0.12, 0.16, 0.16, 0.16, 0.16, 0.08, 48, lightGray);

    createRing("fanFrameOuter", 0.0, fanHubY, headOffsetZ + 0.08, 0.7, 0.82, 0.16, 72, accent);

    var bladeShape = [
        vec2(0.0, 0.0),
        vec2(0.18, -0.14),
        vec2(0.62, -0.07),
        vec2(0.74, 0.04),
        vec2(0.6, 0.16),
        vec2(0.22, 0.22),
        vec2(0.04, 0.1)
    ];
    createExtrudedPolygon(bladeMeshName, bladeShape, 0.06, bladeBlue, true);
}

function computePhysics() {
    physics.theta = omega0 * timeParam + 0.5 * alpha * timeParam * timeParam;
    physics.omega = omega0 + alpha * timeParam;
    physics.linear = physics.omega * radius;
    physics.tangential = alpha * radius;
    return physics;
}

function updatePhysicsDisplay(values) {
    var data = values || computePhysics();
    document.getElementById("thetaValue").textContent = data.theta.toFixed(2);
    document.getElementById("omegaValue").textContent = data.omega.toFixed(2);
    document.getElementById("linearValue").textContent = data.linear.toFixed(2);
    document.getElementById("tangentialValue").textContent = data.tangential.toFixed(2);
}

function render(timestamp) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (autoTime) {
        if (lastTimestamp === null) {
            lastTimestamp = timestamp;
        } else {
            var delta = (timestamp - lastTimestamp) / 1000.0;
            timeParam += delta;
            if (timeParam > timeSliderMax) {
                timeParam = timeSliderMax;
                autoTime = false;
                document.getElementById("autoTimeToggle").checked = false;
            }
            document.getElementById("timeInput").value = timeParam;
            document.getElementById("timeValue").textContent = formatNumber(timeParam);
            lastTimestamp = timestamp;
        }
    } else {
        lastTimestamp = timestamp;
    }

    var currentPhysics = computePhysics();
    updatePhysicsDisplay(currentPhysics);

    var eye = vec3(camX, camY, camZ);
    var at = vec3(0.0, 0.5, 0.0);
    var up = vec3(0.0, 1.0, 0.0);

    var mv = lookAt(eye, at, up);
    mv = mult(mv, translate(tx, ty, tz));
    mv = mult(mv, rotateX(rx));
    mv = mult(mv, rotateY(ry));
    mv = mult(mv, rotateZ(rz));
    mv = mult(mv, scalem(scaleVal));

    var aspect = gl.canvas.width / gl.canvas.height;
    var projection = perspective(55, aspect, 0.1, 50.0);

    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projection));
    gl.uniform3fv(ambientColorLoc, ambientColor);
    gl.uniform3fv(diffuseColorLoc, diffuseColor);
    gl.uniform3fv(specularColorLoc, specularColor);
    gl.uniform3fv(lightPosLoc, lightPos);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(vPositionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPositionLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.vertexAttribPointer(vColorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColorLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.vertexAttribPointer(vTexCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoordLoc);

    gl.uniform1i(useTextureLoc, false);

    drawMeshList(mv, staticMeshes);
    drawMeshList(mv, wireMeshes);

    var bladeBaseMatrix = mult(mv, translate(0.0, fanHubY, headOffsetZ));
    var bladeAngleDeg = currentPhysics.theta * (180.0 / Math.PI);
    var mesh = meshes[bladeMeshName];
    if (mesh) {
        for (var i = 0; i < bladeBaseAngles.length; i++) {
            var bladeModel = mult(bladeBaseMatrix, rotateZ(bladeAngleDeg + bladeBaseAngles[i]));
            bladeModel = mult(bladeModel, rotateY(bladeTiltDeg));
            gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(bladeModel));
            gl.drawArrays(gl.TRIANGLES, mesh.start, mesh.count);
        }
    }

    requestAnimationFrame(render);
}

function drawMeshList(baseMatrix, meshNames) {
    for (var i = 0; i < meshNames.length; i++) {
        var mesh = meshes[meshNames[i]];
        if (!mesh) { continue; }
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(baseMatrix));
        gl.drawArrays(gl.TRIANGLES, mesh.start, mesh.count);
    }
}

function scalem(sx, sy, sz) {
    if (arguments.length === 1) {
        sy = sz = sx;
    }
    var result = mat4();
    result[0][0] = sx;
    result[1][1] = sy;
    result[2][2] = sz;
    result[3][3] = 1.0;
    return result;
}
