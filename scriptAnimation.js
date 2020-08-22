// app state: which component gets plotted
var next = undefined
var gl = undefined
var program = undefined
var component = 3;
var animi = 0

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
var quads = [
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

function setup_scene() {
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

    let mmin = prim.min
    let mmax = prim.max
    document.getElementById('min').innerHTML = mmin.toFixed(2)
    document.getElementById('max').innerHTML = mmax.toFixed(2)
    let mtriaslength = prim.trias.length
    prim = undefined

    // animation state
    let loop = (function () {

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

        gl.uniform1f(gl.getUniformLocation(program, "uMin"), mmin)
        gl.uniform1f(gl.getUniformLocation(program, "uMax"), mmax)
        gl.uniform1f(gl.getUniformLocation(program, "uAnimationScaling"), (animi % 81) / 80)

        // Compute the matrices
        let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
        //let matrix = m4.perspective(60, aspect, -100, 100);
        let matrix = m4.orthographic(-12, 12, -12, 12, -50, 50)
        matrix = m4.translate(matrix, -0.5,-0.5, -2.5)
        // XXX this will overflow at some point...
        matrix = m4.xRotate(matrix, animi * 0.05/9)
        matrix = m4.yRotate(matrix, animi * 0.3/9)
        matrix = m4.zRotate(matrix, animi * 0.01/9)
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
        gl.drawElements(gl.TRIANGLES, mtriaslength, gl.UNSIGNED_SHORT, 0)

        //console.log((new Date()).getMilliseconds())

        // schedule an animation at some later date
        requestAnimationFrame(next)
    })
    next = loop
    requestAnimationFrame(next)
}


function main() {
    // initialize webgl
    const canvas = document.getElementById('c')
    gl = canvas.getContext('webgl2')

    if(gl === null) {
        document.writeln('failed to get GL context')
        return
    }

    // compile & link
    let vShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vShader, document.getElementById('vShader').textContent)
    gl.compileShader(vShader)
    if(!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile vShader: ' + gl.getShaderInfoLog(vShader))
    }
    let fShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fShader, document.getElementById('fShader').textContent)
    gl.compileShader(fShader)
    if(!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile fShader: ' + gl.getShaderInfoLog(fShader))
    }
    program = gl.createProgram()
    gl.attachShader(program, vShader)
    gl.attachShader(program, fShader)
    gl.linkProgram(program)

    // global stuff
    gl.clearColor(1.0, 0.0, 1.0, 0.0)
    gl.enable(gl.DEPTH_TEST)
    gl.viewport(0, 0, canvas.width, canvas.height)

    setup_scene()

    // bump animation state
    setInterval(() => animi = animi + 1, 1000.0/60.0)
}

function setValue(n) {
    component = n %4;
    next = setup_scene
}

window.onload = main
