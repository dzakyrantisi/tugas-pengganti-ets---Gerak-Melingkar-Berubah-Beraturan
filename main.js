"use strict";

let renderer;
let scene;
let camera;
let fanGroup;
let bladesGroup;
let lookTarget;
let ambientLight;
let mainLight;

let materials = [];

let camX = 0.0, camY = 0.6, camZ = 6.5;

let ambientColor = [0.35, 0.35, 0.35];
let diffuseColor = [0.75, 0.75, 0.75];
let specularColor = [1.0, 1.0, 1.0];
let lightPos = [3.0, 4.0, 4.0];

let tx = 0.0, ty = -0.2, tz = -7.0;
let rx = 0.0, ry = 0.0, rz = 0.0;
let scaleVal = 1.0;

let omega0 = 6.0;
let alpha = 0.8;
const radius = 0.7;
let timeParam = 0.0;
let autoTime = true;
const timeSliderMax = 25.0;
let lastTimestamp = null;

const physics = { theta: 0.0, omega: 0.0, linear: 0.0, tangential: 0.0 };
const bladeBaseAngles = [0, 120, 240];
const bladeTiltDeg = -12;
const fanHubY = 0.82;
const headOffsetZ = 0.62;

let timeSlider;

window.onload = function init() {
    const canvas = document.getElementById("gl-canvas");
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(canvas.width, canvas.height, false);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0.94, 0.96, 0.98);

    const aspect = canvas.width / canvas.height;
    camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 50.0);
    camera.position.set(camX, camY, camZ);
    lookTarget = new THREE.Vector3(0.0, 0.5, 0.0);

    ambientLight = new THREE.AmbientLight(colorFromArray(ambientColor));
    scene.add(ambientLight);

    mainLight = new THREE.PointLight(colorFromArray(diffuseColor), 1.4, 100);
    mainLight.position.set(lightPos[0], lightPos[1], lightPos[2]);
    scene.add(mainLight);

    fanGroup = new THREE.Group();
    scene.add(fanGroup);
    createFan();
    updateLightingColors();

    setupUiHandlers();

    updatePhysicsDisplay();
    requestAnimationFrame(render);
};

function setupUiHandlers() {
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
        updateLightingColors();
    });
    document.getElementById("diffuseColor").addEventListener("input", function (e) {
        diffuseColor = hexToRgb01(e.target.value);
        updateLightingColors();
    });
    document.getElementById("specularColor").addEventListener("input", function (e) {
        specularColor = hexToRgb01(e.target.value);
        updateMaterialSpecular();
    });
    document.getElementById("lightX").addEventListener("input", function (e) {
        lightPos[0] = parseFloat(e.target.value);
        mainLight.position.x = lightPos[0];
    });
    document.getElementById("lightY").addEventListener("input", function (e) {
        lightPos[1] = parseFloat(e.target.value);
        mainLight.position.y = lightPos[1];
    });
    document.getElementById("lightZ").addEventListener("input", function (e) {
        lightPos[2] = parseFloat(e.target.value);
        mainLight.position.z = lightPos[2];
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

    timeSlider = document.getElementById("timeInput");
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

    window.rebuildFan = function () {
        createFan();
        updateLightingColors();
    };
}

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
    document.getElementById("timeInput").value = timeParam;
    document.getElementById("autoTimeToggle").checked = autoTime;

    document.getElementById("omega0Value").textContent = formatNumber(omega0);
    document.getElementById("alphaValue").textContent = formatNumber(alpha);
    document.getElementById("timeValue").textContent = formatNumber(timeParam);

    updateLightingColors();
    if (mainLight) {
        mainLight.position.set(lightPos[0], lightPos[1], lightPos[2]);
    }
    updatePhysicsDisplay();
}

function formatNumber(val) {
    return val.toFixed(2);
}

function hexToRgb01(hex) {
    let value = hex.replace('#', '');
    if (value.length === 3) {
        value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
    }
    const bigint = parseInt(value, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r / 255, g / 255, b / 255];
}

function colorFromArray(arr) {
    return new THREE.Color(arr[0], arr[1], arr[2]);
}

function makeMaterial(rgbArr, shininess) {
    const material = new THREE.MeshPhongMaterial({
        color: colorFromArray(rgbArr),
        specular: colorFromArray(specularColor),
        shininess: shininess !== undefined ? shininess : 50,
        side: THREE.DoubleSide
    });
    materials.push(material);
    return material;
}

function updateLightingColors() {
    if (ambientLight) {
        ambientLight.color.setRGB(ambientColor[0], ambientColor[1], ambientColor[2]);
    }
    if (mainLight) {
        mainLight.color.setRGB(diffuseColor[0], diffuseColor[1], diffuseColor[2]);
    }
    updateMaterialSpecular();
}

function updateMaterialSpecular() {
    const specColor = colorFromArray(specularColor);
    materials.forEach(function (material) {
        if (material.isMeshPhongMaterial) {
            material.specular.copy(specColor);
        }
    });
}

function createFan() {
    if (!fanGroup) {
        fanGroup = new THREE.Group();
        scene.add(fanGroup);
    }

    fanGroup.clear();
    materials = [];

    const staticGroup = new THREE.Group();
    fanGroup.add(staticGroup);

    bladesGroup = new THREE.Group();
    bladesGroup.position.set(0.0, fanHubY, headOffsetZ);
    fanGroup.add(bladesGroup);

    const silver = [0.68, 0.68, 0.7];
    const lightGray = [0.82, 0.82, 0.84];
    const darkGray = [0.3, 0.3, 0.32];
    const accent = [0.88, 0.88, 0.9];
    const warmGray = [0.55, 0.55, 0.57];
    const bladeBlue = [0.18, 0.42, 0.82];

    addCylinder(staticGroup, {
        radiusTop: 1.05,
        radiusBottom: 1.22,
        height: 0.2,
        segments: 72,
        position: [0.0, -1.58, 0.0],
        color: silver
    });

    addCylinder(staticGroup, {
        radiusTop: 0.82,
        radiusBottom: 0.98,
        height: 0.12,
        segments: 64,
        position: [0.0, -1.49, 0.0],
        color: accent
    });

    addCylinder(staticGroup, {
        radiusTop: 0.22,
        radiusBottom: 0.28,
        height: 0.64,
        segments: 48,
        position: [0.0, -1.12, 0.0],
        color: silver
    });

    addBox(staticGroup, {
        size: [0.34, 0.88, 0.28],
        position: [0.0, -0.78, 0.08],
        color: warmGray
    });

    addBox(staticGroup, {
        size: [0.22, 0.72, 0.18],
        position: [0.0, -0.78, 0.11],
        color: darkGray
    });

    addBox(staticGroup, {
        size: [0.24, 0.26, 0.2],
        position: [0.0, -0.22, 0.12],
        color: warmGray
    });

    addBox(staticGroup, {
        size: [0.18, 0.3, 0.08],
        position: [0.0, -0.94, 0.22],
        color: darkGray
    });

    for (let b = 0; b < 4; b++) {
        const buttonY = -0.88 + b * 0.1;
        addBox(staticGroup, {
            size: [0.05, 0.08, 0.04],
            position: [0.06, buttonY, 0.27],
            color: accent
        });
    }

    addBox(staticGroup, {
        size: [0.32, 0.3, 0.28],
        position: [0.0, 0.05, 0.16],
        color: silver
    });

    addCylinder(staticGroup, {
        radiusTop: 0.2,
        radiusBottom: 0.2,
        height: 0.16,
        segments: 48,
        position: [0.0, 0.18, 0.32],
        color: darkGray
    });

    const bracketShape = [
        [-0.09, 0.18],
        [0.11, 0.18],
        [0.2, 0.62],
        [0.01, 0.62]
    ];
    addExtrudedPolygon(staticGroup, bracketShape, 0.16, silver, [0.0, 0.0, 0.28]);

    const armDepth = headOffsetZ - 0.18;
    const armCenterZ = 0.18 + armDepth / 2.0;
    addBox(staticGroup, {
        size: [0.16, 0.14, armDepth],
        position: [0.0, 0.72, armCenterZ],
        color: silver
    });

    addBox(staticGroup, {
        size: [0.2, 0.18, 0.24],
        position: [0.0, 0.6, 0.26],
        color: darkGray
    });

    addCylinder(staticGroup, {
        radiusTop: 0.11,
        radiusBottom: 0.11,
        height: 0.14,
        segments: 48,
        position: [0.0, 0.62, 0.36],
        color: darkGray
    });

    const housingDepth = 0.46;
    const housingCenterZ = headOffsetZ - 0.23;
    addBox(staticGroup, {
        size: [0.62, 0.36, housingDepth],
        position: [0.0, fanHubY, housingCenterZ],
        color: lightGray
    });

    addBox(staticGroup, {
        size: [0.56, 0.32, 0.18],
        position: [0.0, fanHubY, housingCenterZ - housingDepth / 2.0 + 0.06],
        color: darkGray
    });

    addCylinder(staticGroup, {
        radiusTop: 0.05,
        radiusBottom: 0.07,
        height: 0.32,
        segments: 36,
        position: [-0.22, fanHubY + 0.28, housingCenterZ + housingDepth / 2.0 - 0.12],
        color: silver
    });

    addCylinder(staticGroup, {
        radiusTop: 0.12,
        radiusBottom: 0.12,
        height: 0.28,
        segments: 48,
        position: [0.0, fanHubY, headOffsetZ],
        color: darkGray
    });

    addCylinder(staticGroup, {
        radiusTop: 0.16,
        radiusBottom: 0.16,
        height: 0.08,
        segments: 48,
        position: [0.0, fanHubY, headOffsetZ + 0.12],
        color: lightGray
    });

    addRing(staticGroup, {
        innerRadius: 0.7,
        outerRadius: 0.82,
        thickness: 0.16,
        segments: 72,
        position: [0.0, fanHubY, headOffsetZ + 0.08],
        color: accent
    });

    const bladeGeometry = createBladeGeometry(0.06);
    const bladeMaterial = makeMaterial(bladeBlue, 70);

    bladeBaseAngles.forEach(function (angleDegValue) {
        const bladeHolder = new THREE.Group();
        bladeHolder.rotation.z = degToRad(angleDegValue);
        const bladeMesh = new THREE.Mesh(bladeGeometry, bladeMaterial);
        bladeMesh.rotation.y = degToRad(bladeTiltDeg);
        bladeHolder.add(bladeMesh);
        bladesGroup.add(bladeHolder);
    });
}

function addCylinder(parent, options) {
    const geometry = new THREE.CylinderGeometry(options.radiusTop, options.radiusBottom, options.height, options.segments || 32, 1, false);
    const mesh = new THREE.Mesh(geometry, makeMaterial(options.color));
    mesh.position.set(options.position[0], options.position[1], options.position[2]);
    if (options.scale) {
        mesh.scale.set(options.scale[0], options.scale[1], options.scale[2]);
    }
    parent.add(mesh);
    return mesh;
}

function addBox(parent, options) {
    const geometry = new THREE.BoxGeometry(options.size[0], options.size[1], options.size[2]);
    const mesh = new THREE.Mesh(geometry, makeMaterial(options.color));
    mesh.position.set(options.position[0], options.position[1], options.position[2]);
    if (options.rotation) {
        mesh.rotation.set(degToRad(options.rotation[0]), degToRad(options.rotation[1]), degToRad(options.rotation[2]));
    }
    parent.add(mesh);
    return mesh;
}

function addExtrudedPolygon(parent, points, thickness, color, offset) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i][0], points[i][1]);
    }
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: false
    });
    geometry.translate(0, 0, -thickness / 2.0);
    if (offset) {
        geometry.translate(offset[0], offset[1], offset[2]);
    }
    const mesh = new THREE.Mesh(geometry, makeMaterial(color));
    parent.add(mesh);
    return mesh;
}

function addRing(parent, options) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, options.outerRadius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, options.innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: options.thickness,
        bevelEnabled: false,
        curveSegments: options.segments || 64
    });
    geometry.translate(0, 0, -options.thickness / 2.0);
    geometry.translate(options.position[0], options.position[1], options.position[2]);

    const mesh = new THREE.Mesh(geometry, makeMaterial(options.color));
    parent.add(mesh);
    return mesh;
}

function createBladeGeometry(thickness) {
    const bladePoints = [
        [0.0, 0.0],
        [0.18, -0.14],
        [0.62, -0.07],
        [0.74, 0.04],
        [0.6, 0.16],
        [0.22, 0.22],
        [0.04, 0.1]
    ];

    const shape = new THREE.Shape();
    shape.moveTo(bladePoints[0][0], bladePoints[0][1]);
    for (let i = 1; i < bladePoints.length; i++) {
        shape.lineTo(bladePoints[i][0], bladePoints[i][1]);
    }
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: false,
        curveSegments: 32
    });
    geometry.translate(0, 0, -thickness / 2.0);
    geometry.computeVertexNormals();
    return geometry;
}

function degToRad(deg) {
    return deg * Math.PI / 180.0;
}

function computePhysics() {
    physics.theta = omega0 * timeParam + 0.5 * alpha * timeParam * timeParam;
    physics.omega = omega0 + alpha * timeParam;
    physics.linear = physics.omega * radius;
    physics.tangential = alpha * radius;
    return physics;
}

function updatePhysicsDisplay(values) {
    const data = values || computePhysics();
    document.getElementById("thetaValue").textContent = data.theta.toFixed(2);
    document.getElementById("omegaValue").textContent = data.omega.toFixed(2);
    document.getElementById("linearValue").textContent = data.linear.toFixed(2);
    document.getElementById("tangentialValue").textContent = data.tangential.toFixed(2);
}

function render(timestamp) {
    requestAnimationFrame(render);

    if (autoTime) {
        if (lastTimestamp === null) {
            lastTimestamp = timestamp;
        } else {
            const delta = (timestamp - lastTimestamp) / 1000.0;
            timeParam += delta;
            if (timeParam > timeSliderMax) {
                timeParam = timeSliderMax;
                autoTime = false;
                document.getElementById("autoTimeToggle").checked = false;
            }
            if (timeSlider) {
                timeSlider.value = timeParam;
            }
            document.getElementById("timeValue").textContent = formatNumber(timeParam);
            lastTimestamp = timestamp;
        }
    } else {
        lastTimestamp = timestamp;
    }

    const currentPhysics = computePhysics();
    updatePhysicsDisplay(currentPhysics);

    fanGroup.position.set(tx, ty, tz);
    fanGroup.rotation.set(degToRad(rx), degToRad(ry), degToRad(rz));
    fanGroup.scale.set(scaleVal, scaleVal, scaleVal);

    camera.position.set(camX, camY, camZ);
    camera.lookAt(lookTarget);

    bladesGroup.rotation.z = currentPhysics.theta;

    if (mainLight) {
        mainLight.position.set(lightPos[0], lightPos[1], lightPos[2]);
    }

    renderer.render(scene, camera);
}
