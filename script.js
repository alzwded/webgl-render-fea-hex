// app state: which component gets plotted
var component = 3;
function setValue(n) {
    component = n %4;
}

// nodes
var nodes = [
    /*0*/[0.0, 0.0,        0.0], 
    /*1*/[0.0, 10.0,       0.0], 
    /*2*/[10.0, 10.0,      0.0], 
    /*3*/[10.0, 0.0,       0.0], 
    /*4*/[ 0.0, 0.0,      10.0],
    /*5*/[ 0.0, 10.0,     10.0],
    /*6*/[ 10.0, 10.0,    10.0],
    /*7*/[ 10.0, 0.0,     10.0]
]

// shift everything to have G in 0,0,0
nodes = nodes.map((e) => e.map((i) => i - 5));

// oriented faces to be rendered
const quads = [
    [3, 2, 1, 0],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6],
    [3, 0, 4, 7]
]
//for(let i = 0; i < 14; ++i) { quads = [...quads, ...quads] } // stressful test


const maxa = 2.0
// displacement xyz results per node
const results = [
    [0.0, 0.0, 0.0     ] ,
    [0.0, 0.0, 0.0     ] ,
    [0.0, 0.0, 0.0     ] ,
    [0.0, 0.0, 0.0     ] ,
    [-maxa, -maxa, maxa   ] ,
    [-maxa, maxa, maxa    ] ,
    [maxa, maxa, maxa     ] ,
    [maxa, -maxa, maxa    ]
]

const vShaderSrc = `#version 300 es 
layout (location = 0) in vec3 aNode;
layout (location = 1) in vec3 aDisplacement;
// A,B&C are adjacent nodes on the quad to compute the face normal
layout (location = 2) in vec3 aA;
layout (location = 3) in vec3 aB;
layout (location = 4) in vec3 aC;
layout (location = 5) in vec2 aTexCoords;
layout (location = 6) in vec4 aCorners;
// 0,1,2=x,y,z, 3=mag
uniform float uMin;
uniform float uMax;
uniform mat4 uMatrix;
out vec2 vTexCoord;
out vec4 vOcolor;
out vec4 vCorners;

out vec3 vCoord;
out vec3 vNormal;

uniform float uAnimationScaling;
void main() {
  vTexCoord = aTexCoords;
  vec4 corners = uAnimationScaling * aCorners;
  vCorners = vec4(
    (corners.x - uMin)/(uMax - uMin),
    (corners.y - uMin)/(uMax - uMin),
    (corners.z - uMin)/(uMax - uMin),
    (corners.w - uMin)/(uMax - uMin));
  vec3 displacement = uAnimationScaling * aDisplacement;
  gl_Position = uMatrix * vec4(aNode + displacement, 1.0);
  vec3 ab = aB - aA;
  vec3 ac = aC - aA;
  vec4 quadNormalPreCamera = vec4(cross(normalize(ab), normalize(ac)), 0.0);
  vec3 normal = normalize(vec3(transpose(inverse(uMatrix)) * quadNormalPreCamera));
  vec3 lightDirection = normalize(vec3(3, -4, 5));
  float nDotL = max(dot(normal, lightDirection), 0.0);
  const float toneDownLight = 0.9;
  float diffuse = nDotL * 0.7 * toneDownLight;
  float ambient = 0.3;
  float ax = (diffuse + ambient);
  vOcolor = vec4(ax, ax, ax, 1.0);

  vCoord =(uMatrix * vec4(aNode + displacement, 1.0)).xyz;
  vNormal = normal;
}
`

const fShaderSrc = `#version 300 es 
precision lowp float;
layout(location = 0) out vec4 fragColor;

in vec2 vTexCoord;
in vec4 vOcolor;
in vec4 vCorners;

in vec3 vCoord;
in vec3 vNormal;

// cute texture mapping
//uniform sampler2D uTexture;
void main() {
  // cute texture mapping
  //vec4 tmp = texture(uTexture, vTexCoord);
  // bilinear interpolation of our 4 corner nodes
  float p = mix(mix(vCorners.x, vCorners.w, vTexCoord.x), mix(vCorners.y, vCorners.z, vTexCoord.x), vTexCoord.y);

  // optional sexy lighting
  vec3 coord = normalize(vCoord);
  vec3 normal = normalize(vNormal);
  vec3 light = normalize(vec3(3,-4,5) - vCoord);
  vec3 V = -coord;
  vec3 R = normalize(light + vCoord);
  float shiny = max(0.0, dot(R, normal));
  shiny = shiny * shiny * shiny * shiny;
  shiny = shiny * shiny * shiny * shiny * shiny * shiny * shiny * shiny;

  vec4 lighting = vOcolor * 0.8 + vec4(shiny, shiny, shiny, 1.0) * 0.2;
  // end optional sexy lighting
  //vec4 lighting = vOcolor;
  
  // map on a red-to-green axis
  fragColor = vec4(lighting.x * p, lighting.x * (1.0-p), 0.0, 1.0);
}
`

// preproc high-level face-based geometry to openGL triangles, vectors, texcoords
function preproc()
{
    // nodal coordinates as passed to opengl
    let coords = []
    // 3 corner nodes of a face to compute the face normal in the shader
    let As = []
    let Bs = []
    let Cs = []
    // triangles as passed to open gl
    let trias = []
    // displacement vector per vertex to displace said vertex
    let disps = []
    // global min/max to normalize result amplitudes
    let min = 0.0
    let max = 0.0
    // texture coordinates to properly map results per face
    let texcoords = []
    // all four corner nodes to compute the texture mapping
    let corners = []

    // for each quad
    for(let i = 0; i < quads.length; ++i) {
        let quad = quads[i]
        // triangulate
        trias.push(4 * i + 0, 4 * i + 1, 4 * i + 2, 4 * i + 0, 4 * i + 2, 4 * i + 3)
        // set texture coordinates
        texcoords.push(
            0.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
            1.0, 0.0
        )
        // push coordinates
        coords.push(
            nodes[quad[0]][0],
            nodes[quad[0]][1],
            nodes[quad[0]][2],
            nodes[quad[1]][0],
            nodes[quad[1]][1],
            nodes[quad[1]][2],
            nodes[quad[2]][0],
            nodes[quad[2]][1],
            nodes[quad[2]][2],
            nodes[quad[3]][0],
            nodes[quad[3]][1],
            nodes[quad[3]][2])
        // push A,B and C corner nodes to compute the face normal
        As.push(
            nodes[quad[0]][0] + results[quad[0]][0],
            nodes[quad[0]][1] + results[quad[0]][1],
            nodes[quad[0]][2] + results[quad[0]][2],
            nodes[quad[0]][0] + results[quad[0]][0],
            nodes[quad[0]][1] + results[quad[0]][1],
            nodes[quad[0]][2] + results[quad[0]][2],
            nodes[quad[0]][0] + results[quad[0]][0],
            nodes[quad[0]][1] + results[quad[0]][1],
            nodes[quad[0]][2] + results[quad[0]][2],
            nodes[quad[0]][0] + results[quad[0]][0],
            nodes[quad[0]][1] + results[quad[0]][1],
            nodes[quad[0]][2] + results[quad[0]][2])
        Bs.push(
            nodes[quad[1]][0] + results[quad[1]][0],
            nodes[quad[1]][1] + results[quad[1]][1],
            nodes[quad[1]][2] + results[quad[1]][2],
            nodes[quad[1]][0] + results[quad[1]][0],
            nodes[quad[1]][1] + results[quad[1]][1],
            nodes[quad[1]][2] + results[quad[1]][2],
            nodes[quad[1]][0] + results[quad[1]][0],
            nodes[quad[1]][1] + results[quad[1]][1],
            nodes[quad[1]][2] + results[quad[1]][2],
            nodes[quad[1]][0] + results[quad[1]][0],
            nodes[quad[1]][1] + results[quad[1]][1],
            nodes[quad[1]][2] + results[quad[1]][2])
        Cs.push(
            nodes[quad[2]][0] + results[quad[2]][0],
            nodes[quad[2]][1] + results[quad[2]][1],
            nodes[quad[2]][2] + results[quad[2]][2],
            nodes[quad[2]][0] + results[quad[2]][0],
            nodes[quad[2]][1] + results[quad[2]][1],
            nodes[quad[2]][2] + results[quad[2]][2],
            nodes[quad[2]][0] + results[quad[2]][0],
            nodes[quad[2]][1] + results[quad[2]][1],
            nodes[quad[2]][2] + results[quad[2]][2],
            nodes[quad[2]][0] + results[quad[2]][0],
            nodes[quad[2]][1] + results[quad[2]][1],
            nodes[quad[2]][2] + results[quad[2]][2])
        // push displacements
        disps.push(
            results[quad[0]][0],
            results[quad[0]][1],
            results[quad[0]][2],
            results[quad[1]][0],
            results[quad[1]][1],
            results[quad[1]][2],
            results[quad[2]][0],
            results[quad[2]][1],
            results[quad[2]][2],
            results[quad[3]][0],
            results[quad[3]][1],
            results[quad[3]][2])
        min = [ 
            results.reduce( (acc, v) => Math.min(acc, v[0]), 999999),
            results.reduce( (acc, v) => Math.min(acc, v[1]), 999999),
            results.reduce( (acc, v) => Math.min(acc, v[2]), 999999),
            results.reduce( (acc, v) => Math.min(acc, Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])), 999999)
        ]
        max = [ 
            results.reduce( (acc, v) => Math.max(acc, v[0]), -999999),
            results.reduce( (acc, v) => Math.max(acc, v[1]), -999999),
            results.reduce( (acc, v) => Math.max(acc, v[2]), -999999),
            results.reduce( (acc, v) => Math.max(acc, Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])), 0)
        ]
        let result = component
        if(result == 3) {
            let sqr = (x) => x*x;
            corners.push(
                Math.sqrt(sqr(results[quad[0]][0]) + sqr(results[quad[0]][1]) + sqr(results[quad[0]][2])),
                Math.sqrt(sqr(results[quad[1]][0]) + sqr(results[quad[1]][1]) + sqr(results[quad[1]][2])),
                Math.sqrt(sqr(results[quad[2]][0]) + sqr(results[quad[2]][1]) + sqr(results[quad[2]][2])),
                Math.sqrt(sqr(results[quad[3]][0]) + sqr(results[quad[3]][1]) + sqr(results[quad[3]][2])),
                Math.sqrt(sqr(results[quad[0]][0]) + sqr(results[quad[0]][1]) + sqr(results[quad[0]][2])),
                Math.sqrt(sqr(results[quad[1]][0]) + sqr(results[quad[1]][1]) + sqr(results[quad[1]][2])),
                Math.sqrt(sqr(results[quad[2]][0]) + sqr(results[quad[2]][1]) + sqr(results[quad[2]][2])),
                Math.sqrt(sqr(results[quad[3]][0]) + sqr(results[quad[3]][1]) + sqr(results[quad[3]][2])),
                Math.sqrt(sqr(results[quad[0]][0]) + sqr(results[quad[0]][1]) + sqr(results[quad[0]][2])),
                Math.sqrt(sqr(results[quad[1]][0]) + sqr(results[quad[1]][1]) + sqr(results[quad[1]][2])),
                Math.sqrt(sqr(results[quad[2]][0]) + sqr(results[quad[2]][1]) + sqr(results[quad[2]][2])),
                Math.sqrt(sqr(results[quad[3]][0]) + sqr(results[quad[3]][1]) + sqr(results[quad[3]][2])),
                Math.sqrt(sqr(results[quad[0]][0]) + sqr(results[quad[0]][1]) + sqr(results[quad[0]][2])),
                Math.sqrt(sqr(results[quad[1]][0]) + sqr(results[quad[1]][1]) + sqr(results[quad[1]][2])),
                Math.sqrt(sqr(results[quad[2]][0]) + sqr(results[quad[2]][1]) + sqr(results[quad[2]][2])),
                Math.sqrt(sqr(results[quad[3]][0]) + sqr(results[quad[3]][1]) + sqr(results[quad[3]][2])))
        } else {
            corners.push(
                results[quad[0]][result],
                results[quad[1]][result],
                results[quad[2]][result],
                results[quad[3]][result],
                results[quad[0]][result],
                results[quad[1]][result],
                results[quad[2]][result],
                results[quad[3]][result],
                results[quad[0]][result],
                results[quad[1]][result],
                results[quad[2]][result],
                results[quad[3]][result],
                results[quad[0]][result],
                results[quad[1]][result],
                results[quad[2]][result],
                results[quad[3]][result])
        }
        // pick the appropriate min/max per the selected component
        max = max[result]
        min = min[result]
            
    }

    return {
        coords: coords,
        trias: trias,
        disps: disps,
        As: As,
        Bs: Bs,
        Cs, Cs,
        min: min,
        max: max,
        texcoords: texcoords,
        corners: corners
    }
}


function main() {
    // initialize webgl
    const canvas = document.getElementById('c')
    const gl = canvas.getContext('webgl2')

    if(gl === null) {
        document.writeln('failed to get GL context')
        return
    }

    // compile & link
    let vShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vShader, vShaderSrc)
    gl.compileShader(vShader)
    if(!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile vShader: ' + gl.getShaderInfoLog(vShader))
    }
    let fShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fShader, fShaderSrc)
    gl.compileShader(fShader)
    if(!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile fShader: ' + gl.getShaderInfoLog(fShader))
    }
    let program = gl.createProgram()
    gl.attachShader(program, vShader)
    gl.attachShader(program, fShader)
    gl.linkProgram(program)

    // global stuff
    gl.clearColor(1.0, 0.0, 1.0, 1.0)
    gl.enable(gl.DEPTH_TEST)
    gl.viewport(0, 0, canvas.width, canvas.height)

    // ===== populate buffers with scene state =====
    let prim = preproc();

    // initialize our buffers
    let coordsBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, coordsBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.coords), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    let colorBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.disps), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    let asBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, asBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.As), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    let bsBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, bsBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.Bs), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    let csBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, csBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.Cs), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    let triaBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triaBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(prim.trias), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

    let texcoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.texcoords), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    let cornersBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, cornersBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.corners), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    // ===== scene populated =====


    // animation state
    let i = 0;
    (function loop() {

        // load program
        gl.useProgram(program)

        // assign inputs
        gl.bindBuffer(gl.ARRAY_BUFFER, coordsBuffer)
        let aNode = 0
        gl.vertexAttribPointer(aNode, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aNode)

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
        let aDisplacement = 1
        gl.vertexAttribPointer(aDisplacement, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aDisplacement)

        gl.bindBuffer(gl.ARRAY_BUFFER, asBuffer)
        let aA = 2
        gl.vertexAttribPointer(aA, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aA)

        gl.bindBuffer(gl.ARRAY_BUFFER, bsBuffer)
        let aB = 3
        gl.vertexAttribPointer(aB, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aB)

        gl.bindBuffer(gl.ARRAY_BUFFER, csBuffer)
        let aC = 4
        gl.vertexAttribPointer(aC, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aC)

        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer)
        let aTexCoords = 5
        gl.vertexAttribPointer(aTexCoords, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aTexCoords)

        gl.bindBuffer(gl.ARRAY_BUFFER, cornersBuffer)
        let aCorners = 6
        gl.vertexAttribPointer(aCorners, 4, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aCorners)

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triaBuffer)

        gl.uniform1f(gl.getUniformLocation(program, "uMin"), prim.min)
        gl.uniform1f(gl.getUniformLocation(program, "uMax"), prim.max)
        gl.uniform1f(gl.getUniformLocation(program, "uAnimationScaling"), (i % 81) / 80)

        // Compute the matrices
        let aspect = canvas.clientWidth / gl.canvas.clientHeight
        //let matrix = m4.perspective(60, aspect, -100, 100);
        let matrix = m4.orthographic(-12, 12, -12, 12, -50, 50)
        matrix = m4.translate(matrix, -0.5,-0.5, -2.5)
        // XXX this will overflow at some point...
        matrix = m4.xRotate(matrix, i * 0.05/9)
        matrix = m4.yRotate(matrix, i * 0.3/9)
        matrix = m4.zRotate(matrix, i * 0.01/9)
        matrix = m4.scale(matrix, 1.0, 1.0, 1.0)

        // Set the matrix.
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "uMatrix"), false, matrix);

        // cute texture mapping
        //let texture = gl.createTexture();
        //gl.activeTexture(gl.TEXTURE0)
        //gl.bindTexture(gl.TEXTURE_2D, texture)
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 0, 255, 255,0,0,255, 0,0,255,255,255,255,0,255]));
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        // draw
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.drawElements(gl.TRIANGLES, prim.trias.length, gl.UNSIGNED_SHORT, 0)

        // schedule an animation at some later date
        requestAnimationFrame(loop)
    })()

    // bump animation state
    setInterval(() => i = i + 1, 1000.0/60.0)
}

window.onload = main
