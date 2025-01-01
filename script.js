document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const gridCanvas = document.getElementById('gridCanvas');
    const gridCtx = gridCanvas.getContext('2d');
    const previewCanvas = document.getElementById('previewCanvas');
    const previewCtx = previewCanvas.getContext('2d');
    const previewWindow = document.getElementById('previewWindow');
    const previewWindowCtx = previewWindow.getContext('2d');
    const currentColorDiv = document.getElementById('currentColor');
    const colorInput = document.getElementById('colorInput');
    const toolButtons = document.querySelectorAll('.tool-btn');
    const layerList = document.getElementById('layerList');
    const addLayerBtn = document.getElementById('addLayer');
    const zoomLevel = document.getElementById('zoomLevel');
    const mousePos = document.getElementById('mousePos');

    let currentTool = 'pencil';
    let currentColor = '#61dafb';
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let zoom = 8;
    let layers = [createLayer()];
    let currentLayerIndex = 0;

    function createLayer() {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = canvas.width;
        layerCanvas.height = canvas.height;
        const layerCtx = layerCanvas.getContext('2d');
        layerCtx.imageSmoothingEnabled = false;
        return layerCanvas;
    }

    function initializeCanvases() {
        const canvasSize = 64;
        [canvas, gridCanvas, previewCanvas].forEach(c => {
            c.width = canvasSize;
            c.height = canvasSize;
            c.style.width = `${canvasSize * zoom}px`;
            c.style.height = `${canvasSize * zoom}px`;
        });
        previewWindow.width = 128;
        previewWindow.height = 128;
        drawGrid();
    }

    function drawGrid() {
        gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        gridCtx.strokeStyle = 'rgba(97, 218, 251, 0.3)';
        gridCtx.lineWidth = 0.5;

        for (let x = 0; x <= gridCanvas.width; x++) {
            gridCtx.beginPath();
            gridCtx.moveTo(x, 0);
            gridCtx.lineTo(x, gridCanvas.height);
            gridCtx.stroke();
        }

        for (let y = 0; y <= gridCanvas.height; y++) {
            gridCtx.beginPath();
            gridCtx.moveTo(0, y);
            gridCtx.lineTo(gridCanvas.width, y);
            gridCtx.stroke();
        }
    }

    function updateLayers() {
        layerList.innerHTML = '';
        layers.forEach((layer, index) => {
            const layerDiv = document.createElement('div');
            layerDiv.className = `flex items-center space-x-2 p-2 rounded ${index === currentLayerIndex ? 'bg-blue-500 bg-opacity-20' : ''}`;
            
            const visibilityBtn = document.createElement('button');
            visibilityBtn.className = 'w-6 h-6 flex items-center justify-center';
            visibilityBtn.textContent = '👁️';
            visibilityBtn.onclick = () => toggleLayerVisibility(index);
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'flex-1';
            nameSpan.textContent = `Layer ${index + 1}`;
            nameSpan.onclick = () => setCurrentLayer(index);
            
            layerDiv.appendChild(visibilityBtn);
            layerDiv.appendChild(nameSpan);
            layerList.appendChild(layerDiv);
        });
        drawLayers();
        updatePreview();
    }

    function updatePreview() {
        previewWindowCtx.clearRect(0, 0, previewWindow.width, previewWindow.height);
        previewWindowCtx.imageSmoothingEnabled = false;
        layers.forEach(layer => {
            if (layer.style.display !== 'none') {
                previewWindowCtx.drawImage(layer, 0, 0, previewWindow.width, previewWindow.height);
            }
        });
    }

    function setCurrentLayer(index) {
        currentLayerIndex = index;
        updateLayers();
    }

    function toggleLayerVisibility(index) {
        layers[index].style.display = layers[index].style.display === 'none' ? 'block' : 'none';
        drawLayers();
        updatePreview();
    }

    function drawLayers() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        layers.forEach(layer => {
            if (layer.style.display !== 'none') {
                ctx.drawImage(layer, 0, 0);
            }
        });
    }

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.floor((e.clientX - rect.left) / zoom),
            y: Math.floor((e.clientY - rect.top) / zoom)
        };
    }

    canvas.addEventListener('mousemove', (e) => {
        const pos = getMousePos(e);
        mousePos.textContent = `${pos.x}, ${pos.y}`;
        if (isDrawing) draw(e);
    });

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    function startDrawing(e) {
        isDrawing = true;
        const pos = getMousePos(e);
        [lastX, lastY] = [pos.x, pos.y];
        draw(e);
    }

    function draw(e) {
        if (!isDrawing) return;
        const pos = getMousePos(e);
        const x = pos.x;
        const y = pos.y;

        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

        const layerCtx = layers[currentLayerIndex].getContext('2d');
        layerCtx.imageSmoothingEnabled = false;

        const size = parseInt(document.getElementById('toolSize').value);
        const opacity = parseInt(document.getElementById('toolOpacity').value) / 100;

        layerCtx.globalAlpha = opacity;

        switch (currentTool) {
            case 'pencil':
                layerCtx.fillStyle = currentColor;
                layerCtx.fillRect(x - Math.floor(size/2), y - Math.floor(size/2), size, size);
                break;
            case 'eraser':
                layerCtx.clearRect(x - Math.floor(size/2), y - Math.floor(size/2), size, size);
                break;
            case 'fill':
                floodFill(x, y, currentColor);
                break;
            case 'line':
            case 'rectangle':
            case 'circle':
                previewCtx.clearRect(0, 0, canvas.width, canvas.height);
                previewCtx.fillStyle = currentColor;
                previewCtx.globalAlpha = opacity;
                
                if (currentTool === 'line') {
                    drawLine(previewCtx, lastX, lastY, x, y, size);
                } else if (currentTool === 'rectangle') {
                    previewCtx.fillRect(
                        Math.min(lastX, x),
                        Math.min(lastY, y),
                        Math.abs(x - lastX) + 1,
                        Math.abs(y - lastY) + 1
                    );
                } else if (currentTool === 'circle') {
                    drawCircle(previewCtx, lastX, lastY, x, y);
                }
                break;
            case 'colorPicker':
                const imageData = layerCtx.getImageData(x, y, 1, 1).data;
                if (imageData[3] > 0) { // If pixel is not transparent
                    currentColor = `#${[...imageData].slice(0,3).map(x => x.toString(16).padStart(2,'0')).join('')}`;
                    colorInput.value = currentColor;
                    currentColorDiv.style.backgroundColor = currentColor;
                    canvas.style.cursor = createPixelCursor(currentColor);
                }
                break;
        }

        layerCtx.globalAlpha = 1;
        drawLayers();
        updatePreview();
    }

    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;

        if (['line', 'rectangle', 'circle'].includes(currentTool)) {
            const layerCtx = layers[currentLayerIndex].getContext('2d');
            layerCtx.drawImage(previewCanvas, 0, 0);
            previewCtx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        drawLayers();
        updatePreview();
    }

    function drawLine(context, x1, y1, x2, y2, thickness) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = (x1 < x2) ? 1 : -1;
        const sy = (y1 < y2) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            context.fillRect(x1 - Math.floor(thickness/2), y1 - Math.floor(thickness/2), thickness, thickness);

            if (x1 === x2 && y1 === y2) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x1 += sx; }
            if (e2 < dx) { err += dx; y1 += sy; }
        }
    }

    function drawCircle(context, x1, y1, x2, y2) {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        let x = radius;
        let y = 0;
        let radiusError = 1 - x;

        while (x >= y) {
            context.fillRect(x1 + x, y1 + y, 1, 1);
            context.fillRect(x1 + y, y1 + x, 1, 1);
            context.fillRect(x1 - x, y1 + y, 1, 1);
            context.fillRect(x1 - y, y1 + x, 1, 1);
            context.fillRect(x1 - x, y1 - y, 1, 1);
            context.fillRect(x1 - y, y1 - x, 1, 1);
            context.fillRect(x1 + x, y1 - y, 1, 1);
            context.fillRect(x1 + y, y1 - x, 1, 1);
            y++;
            
            if (radiusError < 0) {
                radiusError += 2 * y + 1;
            } else {
                x--;
                radiusError += 2 * (y - x + 1);
            }
        }
    }

    function floodFill(startX, startY, fillColor) {
        const layerCtx = layers[currentLayerIndex].getContext('2d');
        const imageData = layerCtx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        const startPos = (startY * canvas.width + startX) * 4;
        const startR = pixels[startPos];
        const startG = pixels[startPos + 1];
        const startB = pixels[startPos + 2];
        const startA = pixels[startPos + 3];

        const fillR = parseInt(fillColor.slice(1,3), 16);
        const fillG = parseInt(fillColor.slice(3,5), 16);
        const fillB = parseInt(fillColor.slice(5,7), 16);

        if (startR === fillR && startG === fillG && startB === fillB) return;

        const stack = [[startX, startY]];
        
        while (stack.length) {
            const [x, y] = stack.pop();
            const pos = (y * canvas.width + x) * 4;

            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
            if (pixels[pos] !== startR || pixels[pos + 1] !== startG || 
                pixels[pos + 2] !== startB || pixels[pos + 3] !== startA) continue;

            pixels[pos] = fillR;
            pixels[pos + 1] = fillG;
            pixels[pos + 2] = fillB;
            pixels[pos + 3] = 255;

            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        layerCtx.putImageData(imageData, 0, 0);
    }

    function createPixelCursor(color) {
        const cursorSize = 16;
        const cursorCanvas = document.createElement('canvas');
        cursorCanvas.width = cursorSize;
        cursorCanvas.height = cursorSize;
        const ctx = cursorCanvas.getContext('2d');

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, cursorSize, cursorSize);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, cursorSize - 1, 1);
        ctx.fillRect(0, 0, 1, cursorSize - 1);
        ctx.fillRect(cursorSize - 1, 1, 1, cursorSize - 1);
        ctx.fillRect(1, cursorSize - 1, cursorSize - 1, 1);

        return `url(${cursorCanvas.toDataURL()}) ${cursorSize/2} ${cursorSize/2}, auto`;
    }

    function updateCursor() {
        if (['pencil', 'eraser', 'fill'].includes(currentTool)) {
            canvas.style.cursor = createPixelCursor(currentTool === 'eraser' ? '#FFFFFF' : currentColor);
        } else if (currentTool === 'move') {
            canvas.style.cursor = 'move';
        } else if (currentTool === 'colorPicker') {
            canvas.style.cursor = 'crosshair';
        } else {
            canvas.style.cursor = 'default';
        }
    }

    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentTool = button.id;
            toolButtons.forEach(btn => btn.classList.remove('tool-active'));
            button.classList.add('tool-active');
            updateCursor();
        });
    });

    colorInput.addEventListener('input', (e) => {
        currentColor = e.target.value;
        currentColorDiv.style.backgroundColor = currentColor;
        updateCursor();
    });

    document.querySelectorAll('[data-color]').forEach(colorDiv => {
        colorDiv.addEventListener('click', () => {
            currentColor = colorDiv.dataset.color;
            colorInput.value = currentColor;
            currentColorDiv.style.backgroundColor = currentColor;
            updateCursor();
        });
    });

    addLayerBtn.addEventListener('click', () => {
        layers.push(createLayer());
        currentLayerIndex = layers.length - 1;
        updateLayers();
    });

    zoomLevel.addEventListener('change', (e) => {
        zoom = parseInt(e.target.value);
        canvas.style.width = `${canvas.width * zoom}px`;
        canvas.style.height = `${canvas.height * zoom}px`;
        gridCanvas.style.width = `${gridCanvas.width * zoom}px`;
        gridCanvas.style.height = `${gridCanvas.height * zoom}px`;
        previewCanvas.style.width = `${previewCanvas.width * zoom}px`;
        previewCanvas.style.height = `${previewCanvas.height * zoom}px`;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const shortcuts = {
            'b': 'pencil',
            'e': 'eraser',
            'g': 'fill',
            'i': 'colorPicker',
            'u': 'rectangle',
            'c': 'circle',
            'l': 'line',
            'v': 'move'
        };

        if (shortcuts[e.key.toLowerCase()]) {
            const tool = shortcuts[e.key.toLowerCase()];
            currentTool = tool;
            toolButtons.forEach(btn => {
                if (btn.id === tool) btn.classList.add('tool-active');
                else btn.classList.remove('tool-active');
            });
            updateCursor();
        }
    });

    function exportImage() {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const exportCtx = exportCanvas.getContext('2d');

        layers.forEach(layer => {
            if (layer.style.display !== 'none') {
                exportCtx.drawImage(layer, 0, 0);
            }
        });

        const link = document.createElement('a');
        link.download = 'pixel_art.png';
        link.href = exportCanvas.toDataURL();
        link.click();
    }

    function flipHorizontal() {
        const layerCtx = layers[currentLayerIndex].getContext('2d');
        const imageData = layerCtx.getImageData(0, 0, canvas.width, canvas.height);
        layerCtx.clearRect(0, 0, canvas.width, canvas.height);
        layerCtx.save();
        layerCtx.scale(-1, 1);
        layerCtx.drawImage(layers[currentLayerIndex], -canvas.width, 0);
        layerCtx.restore();
        drawLayers();
        updatePreview();
    }

    function flipVertical() {
        const layerCtx = layers[currentLayerIndex].getContext('2d');
        const imageData = layerCtx.getImageData(0, 0, canvas.width, canvas.height);
        layerCtx.clearRect(0, 0, canvas.width, canvas.height);
        layerCtx.save();
        layerCtx.scale(1, -1);
        layerCtx.drawImage(layers[currentLayerIndex], 0, -canvas.height);
        layerCtx.restore();
        drawLayers();
        updatePreview();
    }

    document.getElementById('exportBtn').addEventListener('click', exportImage);
    document.getElementById('flipHorizontalBtn').addEventListener('click', flipHorizontal);
    document.getElementById('flipVerticalBtn').addEventListener('click', flipVertical);

    // Initialize
    initializeCanvases();
    updateLayers();
});
