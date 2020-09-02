// app state: which component gets plotted
var state = {
    component: 3,
    deformation: true,
    animframe: 0,
    next: undefined,
    render: undefined,
    colorAxisType: 1
}

// nodes
var nodes
var globalMax
var globalMin

// oriented faces to be rendered
//for(let i = 0; i < 14; ++i) { quads = [...quads, ...quads] } // stressful test
var quads


// displacement xyz results per node
var results

let fakePromise = (fn) => {
    return new Promise( (resolve) => {
        setTimeout(async () => {
            await fn()
            setTimeout(resolve, 1)
        }, 0)
    });
};

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
            nodes[3 * quad[0] + 0],
            nodes[3 * quad[0] + 1],
            nodes[3 * quad[0] + 2],
            nodes[3 * quad[1] + 0],
            nodes[3 * quad[1] + 1],
            nodes[3 * quad[1] + 2],
            nodes[3 * quad[2] + 0],
            nodes[3 * quad[2] + 1],
            nodes[3 * quad[2] + 2],
            nodes[3 * quad[3] + 0],
            nodes[3 * quad[3] + 1],
            nodes[3 * quad[3] + 2])
        // push A,B and C corner nodes to compute the face normal
        As.push(
            nodes[3 * quad[0] + 0] + results[3 * quad[0] + 0],
            nodes[3 * quad[0] + 1] + results[3 * quad[0] + 1],
            nodes[3 * quad[0] + 2] + results[3 * quad[0] + 2],
            nodes[3 * quad[0] + 0] + results[3 * quad[0] + 0],
            nodes[3 * quad[0] + 1] + results[3 * quad[0] + 1],
            nodes[3 * quad[0] + 2] + results[3 * quad[0] + 2],
            nodes[3 * quad[0] + 0] + results[3 * quad[0] + 0],
            nodes[3 * quad[0] + 1] + results[3 * quad[0] + 1],
            nodes[3 * quad[0] + 2] + results[3 * quad[0] + 2],
            nodes[3 * quad[0] + 0] + results[3 * quad[0] + 0],
            nodes[3 * quad[0] + 1] + results[3 * quad[0] + 1],
            nodes[3 * quad[0] + 2] + results[3 * quad[0] + 2])
        Bs.push(
            nodes[3 * quad[1] + 0] + results[3 * quad[1] + 0],
            nodes[3 * quad[1] + 1] + results[3 * quad[1] + 1],
            nodes[3 * quad[1] + 2] + results[3 * quad[1] + 2],
            nodes[3 * quad[1] + 0] + results[3 * quad[1] + 0],
            nodes[3 * quad[1] + 1] + results[3 * quad[1] + 1],
            nodes[3 * quad[1] + 2] + results[3 * quad[1] + 2],
            nodes[3 * quad[1] + 0] + results[3 * quad[1] + 0],
            nodes[3 * quad[1] + 1] + results[3 * quad[1] + 1],
            nodes[3 * quad[1] + 2] + results[3 * quad[1] + 2],
            nodes[3 * quad[1] + 0] + results[3 * quad[1] + 0],
            nodes[3 * quad[1] + 1] + results[3 * quad[1] + 1],
            nodes[3 * quad[1] + 2] + results[3 * quad[1] + 2])
        Cs.push(
            nodes[3 * quad[2] + 0] + results[3 * quad[2] + 0],
            nodes[3 * quad[2] + 1] + results[3 * quad[2] + 1],
            nodes[3 * quad[2] + 2] + results[3 * quad[2] + 2],
            nodes[3 * quad[2] + 0] + results[3 * quad[2] + 0],
            nodes[3 * quad[2] + 1] + results[3 * quad[2] + 1],
            nodes[3 * quad[2] + 2] + results[3 * quad[2] + 2],
            nodes[3 * quad[2] + 0] + results[3 * quad[2] + 0],
            nodes[3 * quad[2] + 1] + results[3 * quad[2] + 1],
            nodes[3 * quad[2] + 2] + results[3 * quad[2] + 2],
            nodes[3 * quad[2] + 0] + results[3 * quad[2] + 0],
            nodes[3 * quad[2] + 1] + results[3 * quad[2] + 1],
            nodes[3 * quad[2] + 2] + results[3 * quad[2] + 2])
        // push displacements
        disps.push(
            results[3 * quad[0] + 0],
            results[3 * quad[0] + 1],
            results[3 * quad[0] + 2],
            results[3 * quad[1] + 0],
            results[3 * quad[1] + 1],
            results[3 * quad[1] + 2],
            results[3 * quad[2] + 0],
            results[3 * quad[2] + 1],
            results[3 * quad[2] + 2],
            results[3 * quad[3] + 0],
            results[3 * quad[3] + 1],
            results[3 * quad[3] + 2])
        let sqr = x => x*x;
        min = globalMin
        max = globalMax
        let result = state.component
        if(result == 3) {
            corners.push(
                results[3 * quad[0] + 0],results[3 * quad[0] + 1],results[3 * quad[0] + 2],
                results[3 * quad[1] + 0],results[3 * quad[1] + 1],results[3 * quad[1] + 2],
                results[3 * quad[2] + 0],results[3 * quad[2] + 1],results[3 * quad[2] + 2],
                results[3 * quad[3] + 0],results[3 * quad[3] + 1],results[3 * quad[3] + 2],
                results[3 * quad[0] + 0],results[3 * quad[0] + 1],results[3 * quad[0] + 2],
                results[3 * quad[1] + 0],results[3 * quad[1] + 1],results[3 * quad[1] + 2],
                results[3 * quad[2] + 0],results[3 * quad[2] + 1],results[3 * quad[2] + 2],
                results[3 * quad[3] + 0],results[3 * quad[3] + 1],results[3 * quad[3] + 2],
                results[3 * quad[0] + 0],results[3 * quad[0] + 1],results[3 * quad[0] + 2],
                results[3 * quad[1] + 0],results[3 * quad[1] + 1],results[3 * quad[1] + 2],
                results[3 * quad[2] + 0],results[3 * quad[2] + 1],results[3 * quad[2] + 2],
                results[3 * quad[3] + 0],results[3 * quad[3] + 1],results[3 * quad[3] + 2],
                results[3 * quad[0] + 0],results[3 * quad[0] + 1],results[3 * quad[0] + 2],
                results[3 * quad[1] + 0],results[3 * quad[1] + 1],results[3 * quad[1] + 2],
                results[3 * quad[2] + 0],results[3 * quad[2] + 1],results[3 * quad[2] + 2],
                results[3 * quad[3] + 0],results[3 * quad[3] + 1],results[3 * quad[3] + 2])
        } else {
            corners.push(
                results[3 * quad[0] + result],
                results[3 * quad[1] + result],
                results[3 * quad[2] + result],
                results[3 * quad[3] + result],
                results[3 * quad[0] + result],
                results[3 * quad[1] + result],
                results[3 * quad[2] + result],
                results[3 * quad[3] + result],
                results[3 * quad[0] + result],
                results[3 * quad[1] + result],
                results[3 * quad[2] + result],
                results[3 * quad[3] + result],
                results[3 * quad[0] + result],
                results[3 * quad[1] + result],
                results[3 * quad[2] + result],
                results[3 * quad[3] + result])
        }
        // pick the appropriate min/max per the selected component
        max = max[result]
        min = min[result]
    }

    document.getElementById('progress').innerHTML = ''
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

function computeCornerData(result, corners, buffer)
{
    let gl = state.gl
    if(result == 3) {
        gl.useProgram(state.magnitudeProgram)

        let tempCorners = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, tempCorners)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW)

        let aA = 0
        let oneVec3 = 3 * 4
        let stride = 4/*ABCD*/ * 3/*vec3*/ * 4 /*FLOAT*/
        gl.vertexAttribPointer(aA, 3, gl.FLOAT, false, stride, 0 * oneVec3)
        gl.enableVertexAttribArray(aA)
        let aB = 1
        gl.vertexAttribPointer(aB, 3, gl.FLOAT, false, stride, 1 * oneVec3)
        gl.enableVertexAttribArray(aB)
        let aC = 2
        gl.vertexAttribPointer(aC, 3, gl.FLOAT, false, stride, 2 * oneVec3)
        gl.enableVertexAttribArray(aC)
        let aD = 3
        gl.vertexAttribPointer(aD, 3, gl.FLOAT, false, stride, 3 * oneVec3)
        gl.enableVertexAttribArray(aD)

        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, buffer)
        gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 4 * 4 * corners.length, gl.STATIC_COPY)
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null)
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer)

        gl.enable(gl.RASTERIZER_DISCARD)
        gl.beginTransformFeedback(gl.POINTS)
        gl.drawArrays(gl.POINTS, 0, corners.length / 3 / 4)
        gl.endTransformFeedback(gl.POINTS)
        gl.disable(gl.RASTERIZER_DISCARD)

        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    } else {
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);
    }
}

async function setup_scene() {
    
    let gl = state.gl

    // ===== populate buffers with scene state =====
    let prim = await preproc(gl);

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
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(prim.trias), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

    let texcoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.texcoords), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    let cornersBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, cornersBuffer)
    computeCornerData(state.component, prim.corners, cornersBuffer)
    //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.corners), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    // ===== scene populated =====

    // ===== transform buffers =====
    let tNormalsBuffer = gl.createBuffer()
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tNormalsBuffer)
    gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 4 * prim.coords.length * 4, gl.STATIC_COPY)
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null)

    let tCornersBuffer = gl.createBuffer()
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tCornersBuffer)
    gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 4 * prim.coords.length * 4, gl.STATIC_COPY)
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null)

    let tCoordsBuffer = gl.createBuffer()
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tCoordsBuffer)
    gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 4 * prim.coords.length * 3, gl.STATIC_COPY)
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null)

    let mmin = prim.min
    let mmax = prim.max
    let mcoordslength = prim.coords.length
    let mtriaslength = prim.trias.length
    prim = undefined

    state.render = (() => {
        gl.useProgram(state.transformProgram)
 
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
    
        gl.bindBuffer(gl.ARRAY_BUFFER, cornersBuffer)
        let aCorners = 5
        gl.vertexAttribPointer(aCorners, 4, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aCorners)

        // bind transform buffers
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, tNormalsBuffer);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, tCornersBuffer);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, tCoordsBuffer);
    
        gl.uniform1f(gl.getUniformLocation(state.transformProgram, "uMin"), mmin)
        gl.uniform1f(gl.getUniformLocation(state.transformProgram, "uMax"), mmax)
        document.getElementById('min').innerHTML = mmin.toFixed(2)
        document.getElementById('max').innerHTML = mmax.toFixed(2)
        gl.uniform1f(gl.getUniformLocation(state.transformProgram, "uDeformation"), state.deformation ? 23.0 : 0.0)

        gl.enable(gl.RASTERIZER_DISCARD)
        gl.beginTransformFeedback(gl.POINTS)

        gl.drawArrays(gl.POINTS, 0, mcoordslength/3)

        gl.endTransformFeedback()
        gl.disable(gl.RASTERIZER_DISCARD)
        //gl.flush();

        // unbind transform buffers
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, null);

        let loop = function _loop() {
            let gl = state.gl
            // load program
            gl.useProgram(state.renderProgram)
    
            // re-assign transform buffers as inputs
            gl.bindBuffer(gl.ARRAY_BUFFER, tCoordsBuffer)
            let aDisplaced = 0
            gl.vertexAttribPointer(aNode, 3, gl.FLOAT, false, 0, 0)
            gl.enableVertexAttribArray(aNode)
    
            gl.bindBuffer(gl.ARRAY_BUFFER, tNormalsBuffer)
            let aNormal = 1
            gl.vertexAttribPointer(aNormal, 4, gl.FLOAT, false, 0, 0)
            gl.enableVertexAttribArray(aNormal)

            gl.bindBuffer(gl.ARRAY_BUFFER, tCornersBuffer)
            let aCorners = 2
            gl.vertexAttribPointer(aCorners, 4, gl.FLOAT, false, 0, 0)
            gl.enableVertexAttribArray(aCorners)
    
            // assign remaining inputs
            gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer)
            let aTexCoords = 3
            gl.vertexAttribPointer(aTexCoords, 2, gl.FLOAT, false, 0, 0)
            gl.enableVertexAttribArray(aTexCoords)
    
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triaBuffer)
    
            // Compute the matrices
            let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
            // model matrix
            let matrix = m4.identity()
            // XXX this will overflow at some point...
            matrix = m4.xRotate(matrix, state.animframe * 0.05/9)
            matrix = m4.yRotate(matrix, state.animframe * 0.3/9)
            matrix = m4.zRotate(matrix, state.animframe * 0.01/9)
            matrix = m4.scale(matrix, 1.0, 1.0, 1.0)
            // out light is actually tethered to the camera (overhead light, of sorts)
            const dist = 24 * 150
            let lightPos = m4.scaleVector([1,-1, -3], dist/3.0)
            let viewMatrix = m4.translate(m4.identity(), 0, 0, -dist)
            // apply view matrix to get model-view matrix
            matrix = m4.multiply(viewMatrix, matrix)
            // projection matrix
            let mvpMatrix = m4.perspective(3.14159/3, aspect, 0.1, dist * 4)
            // apply projection matrix to get projection-model-view matrix
            mvpMatrix = m4.multiply(mvpMatrix, matrix)
            
    
            // Set the matrix.
            gl.uniformMatrix4fv(gl.getUniformLocation(state.renderProgram, "uMatrix"), false, matrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(state.renderProgram, "uMVP"), false, mvpMatrix);
            gl.uniform3fv(gl.getUniformLocation(state.renderProgram, "uLight"), lightPos);
            gl.uniform1i(gl.getUniformLocation(state.renderProgram, "uColorAxisType"), state.colorAxisType)
    
            // cute texture mapping
            //let texture = gl.createTexture();
            //gl.activeTexture(gl.TEXTURE0)
            //gl.bindTexture(gl.TEXTURE_2D, texture)
            //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 0, 255, 255,0,0,255, 0,0,255,255,255,255,0,255]));
            //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
            // draw
            gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT)
            gl.drawElements(gl.TRIANGLES, mtriaslength, gl.UNSIGNED_INT, 0)

            //console.log((new Date()).getMilliseconds())
            requestAnimationFrame(state.next)
        }
        // schedule an animation at some later date
        state.next = loop
        state.next()
    })
    state.next = state.render
    state.next()
}



function maingl() {
    // initialize webgl
    const canvas = document.getElementById('c')
    const gl = canvas.getContext('webgl2')

    if(gl === null) {
        document.writeln('failed to get GL context')
        return
    }

    state.gl = gl
    state.canvas = canvas

    // compile & link
    let vTransform = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vTransform, document.getElementById('vTransform').textContent)
    gl.compileShader(vTransform)
    if(!gl.getShaderParameter(vTransform, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile vTransform: ' + gl.getShaderInfoLog(vTransform))
    }
    state.vTransform = vTransform
    let fTransform = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fTransform, document.getElementById('fTransform').textContent)
    gl.compileShader(fTransform)
    if(!gl.getShaderParameter(fTransform, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile fTransform: ' + gl.getShaderInfoLog(fTransform))
    }
    state.fTransform = fTransform

    let vShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vShader, document.getElementById('vRender').textContent)
    gl.compileShader(vShader)
    if(!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile vShader: ' + gl.getShaderInfoLog(vShader))
    }
    state.vRender = vShader
    let fShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fShader, document.getElementById('fRender').textContent)
    gl.compileShader(fShader)
    if(!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile fShader: ' + gl.getShaderInfoLog(fShader))
    }
    state.fRender = fShader
    let transformProgram = gl.createProgram()
    gl.attachShader(transformProgram, vTransform)
    gl.attachShader(transformProgram, fTransform)
    const feedbackVarying = [ "vNormal", "vCorners", "vDisplaced" ]
    gl.transformFeedbackVaryings(transformProgram, feedbackVarying, gl.SEPARATE_ATTRIBS)
    gl.linkProgram(transformProgram)
    state.transformProgram = transformProgram

    let program = gl.createProgram()
    gl.attachShader(program, vShader)
    gl.attachShader(program, fShader)
    gl.linkProgram(program)
    state.renderProgram = program

    let vMagnitude = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vMagnitude, document.getElementById('vMagnitude').textContent)
    gl.compileShader(vMagnitude)
    if(!gl.getShaderParameter(vMagnitude, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile fTransform: ' + gl.getShaderInfoLog(vMagnitude))
    }
    state.vMagnitude = vMagnitude
    let magnitudeProgram = gl.createProgram()
    gl.attachShader(magnitudeProgram, vMagnitude)
    gl.attachShader(magnitudeProgram, fTransform)
    const magnitudeFeedbackVarying = [ "vCorners" ]
    gl.transformFeedbackVaryings(magnitudeProgram, magnitudeFeedbackVarying, gl.INTERLEAVED_ATTRIBS)
    gl.linkProgram(magnitudeProgram)
    state.magnitudeProgram = magnitudeProgram

    // global stuff
    gl.clearColor(1.0, 0.0, 1.0, 0.0)
    gl.enable(gl.DEPTH_TEST)
    gl.viewport(0, 0, canvas.width, canvas.height)

    setup_scene()

    // bump animation state
    setInterval(() => state.animframe = state.animframe + 1, 1000.0/60.0)
}

function setValue(n) {
    state.component = n %4;
    state.next = setup_scene
}
function setDeformation(b) {
    state.deformation = b;
    state.next = state.render
}
function setColorAxis(n) {
    state.colorAxisType = n;
    document.getElementById('min').style.color = ['green', 'blue'][n];
}

function main() {
    let processChunk = (r) => {
        if(!r.done) {
            return 
        }
    };
    document.getElementById('progress').innerHTML = 'Loading node coordinates'
    fetch('./nodes.bin').then( r => r.blob()).then( blob => {
        const reader = new FileReader();
        return new Promise((resolve) => {
            reader.addEventListener('loadend', () => {
                resolve(new Float32Array(reader.result))
            });
            reader.readAsArrayBuffer(blob)
        });
    }).then( nodesArray => {
        nodes = nodesArray
        return Promise.resolve()
    }).then( () => {
        document.getElementById('progress').innerHTML = 'Loading nodal displacements'
        return fetch('./mode-11.bin')
    }).then( r => r.blob() ).then( blob => {
        const reader = new FileReader();
        return new Promise((resolve) => {
            reader.addEventListener('loadend', () => {
                resolve(new Float32Array(reader.result))
            });
            reader.readAsArrayBuffer(blob)
        });
    }).then( resultArray => {
        //results = Array.prototype.slice.call(resultArray)
        results = resultArray
        document.getElementById('progress').innerHTML = 'Loading connectivity'
        return Promise.resolve()
    }).then( () => fetch('./connect.bin') ).then( r => r.blob() ).then( blob => {
        const reader = new FileReader();
        return new Promise((resolve) => {
            reader.addEventListener('loadend', () => {
                resolve(new Int32Array(reader.result))
            });
            reader.readAsArrayBuffer(blob)
        });
    }).then( (hexas) => {
        document.getElementById('progress').innerHTML = 'Determining visible faces'
        return hexas
    }).then( async (hexas) => {
        //  ,.7----6
        // 4----5-'|
        // |,.3-|--2
        // 0----1-'
        let faces = {}
        function pushQuad( quad ) {
            let sorted = [...quad]
            sorted.sort()
            if(sorted in faces) {
                delete faces[sorted]
            } else {
                faces[sorted] = quad
            }
        }
        let kk = 0
        for(let i = 0; i < hexas.length / 8; ++i) {
            pushQuad([hexas[8*i + 0], hexas[8*i + 3], hexas[8*i + 2], hexas[8*i + 1]])
            pushQuad([hexas[8*i + 4], hexas[8*i + 5], hexas[8*i + 6], hexas[8*i + 7]])
            pushQuad([hexas[8*i + 1], hexas[8*i + 2], hexas[8*i + 6], hexas[8*i + 5]])
            pushQuad([hexas[8*i + 3], hexas[8*i + 0], hexas[8*i + 4], hexas[8*i + 7]])
            pushQuad([hexas[8*i + 0], hexas[8*i + 1], hexas[8*i + 5], hexas[8*i + 4]])
            pushQuad([hexas[8*i + 3], hexas[8*i + 7], hexas[8*i + 6], hexas[8*i + 2]])
            if(kk == 4000) {
                kk = 0
                await fakePromise( () => {
                    document.getElementById('progress').innerHTML = `Determining visible faces ${(100.0 * i / (hexas.length / 8)).toFixed(2)}%`
                });
            }
            ++kk
        }
        quads = Object.values(faces)
    }).then( () => fetch('./minmax-11.bin') ).then( r => r.blob() ) .then( blob => {
        const reader = new FileReader();
        return new Promise((resolve) => {
            reader.addEventListener('loadend', () => {
                resolve(new Float32Array(reader.result))
            });
            reader.readAsArrayBuffer(blob)
        });
    }).then( minmax => {
        globalMin = [ minmax[0], minmax[1], minmax[2], minmax[3] ]
        globalMax = [ minmax[4], minmax[5], minmax[6], minmax[7] ]
    }).then( () => {
        document.getElementById('progress').innerHTML = 'Uploading scene to GPU'
    }).then(maingl)
}

window.onload = main
