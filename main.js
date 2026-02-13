      let calculationResults = null;
        let currentVisualizationMode = '2d';
        let scene, camera, renderer, controls;
        let boxMeshes = [];
        let containerMesh = null;
        let animationId = null;

        // Initialize page
        document.addEventListener('DOMContentLoaded', function() {
            initializeJiffyAnimations();
            setupEventListeners();
        });

        function initializeJiffyAnimations() {
            // Add entrance animations to cards
            const cards = document.querySelectorAll('.glass-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('jiffy-fade-in');
                }, index * 100);
            });

            // Add hover effects to interactive elements
            const buttons = document.querySelectorAll('button');
            buttons.forEach(button => {
                button.addEventListener('mouseenter', function() {
                    this.classList.add('jiffy-hover-lift');
                });
                
                button.addEventListener('mouseleave', function() {
                    this.classList.remove('jiffy-hover-lift');
                });
            });

            // Add input field animations
            const inputs = document.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('focus', function() {
                    this.classList.add('jiffy-zoom-in');
                });
                
                input.addEventListener('blur', function() {
                    this.classList.remove('jiffy-zoom-in');
                });
            });
        }

        function setupEventListeners() {
            // Radio button change listeners
            const radioButtons = document.querySelectorAll('input[name="layoutPattern"]');
            radioButtons.forEach(radio => {
                radio.addEventListener('change', function() {
                    this.closest('.radio-card').classList.add('jiffy-bounce');
                    setTimeout(() => {
                        this.closest('.radio-card').classList.remove('jiffy-bounce');
                    }, 600);
                });
            });

            // Checkbox listeners
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    this.closest('label').classList.add('jiffy-pulse');
                    setTimeout(() => {
                        this.closest('label').classList.remove('jiffy-pulse');
                    }, 2000);
                });
            });

            // Initialize container panel as collapsed
            document.getElementById('containerInputs').style.display = 'none';
        }

        function toggleContainerPanel() {
            const inputs = document.getElementById('containerInputs');
            const isHidden = inputs.style.display === 'none';
            
            if (isHidden) {
                inputs.style.display = 'grid';
                inputs.classList.add('jiffy-slide-up');
            } else {
                inputs.style.display = 'none';
                inputs.classList.remove('jiffy-slide-up');
            }
            
            // Reset calculation results when container size changes
            if (calculationResults) {
                calculationResults = null;
                document.getElementById('resultsContainer').innerHTML = `
                    <div class="text-center text-gray-500 py-12">
                        <div class="text-8xl mb-6 jiffy-pulse">📦</div>
                        <p class="text-lg font-medium jiffy-fade-in">Ukuran kontainer diubah. Klik "Hitung Layout Optimal" untuk hasil baru</p>
                    </div>
                `;
                document.getElementById('visualizationContainer').innerHTML = `
                    <div class="text-center text-gray-500">
                        <div class="text-6xl lg:text-8xl mb-6 jiffy-pulse">🎨</div>
                        <p class="text-lg lg:text-xl font-medium jiffy-fade-in">Visualisasi akan muncul setelah perhitungan</p>
                    </div>
                `;
            }
        }

        function updateContainerVolume() {
            const length = parseFloat(document.getElementById('containerLength').value) || 0;
            const width = parseFloat(document.getElementById('containerWidth').value) || 0;
            const height = parseFloat(document.getElementById('containerHeight').value) || 0;
            
            const volume = (length * width * height) / 1000000; // Convert to m³
            document.getElementById('containerVolume').textContent = volume.toFixed(2) + ' m³';
        }

        function showJiffyAlert(message, type = 'info') {
            const alert = document.createElement('div');
            alert.className = `jiffy-alert ${type} jiffy-bounce`;
            
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            
            alert.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-xl">${icons[type]}</span>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(alert);
            
            setTimeout(() => {
                alert.classList.add('jiffy-fade-out');
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 300);
            }, 3000);
        }

        function calculateOptimalLayout() {
            const button = event.target;
            button.classList.add('jiffy-pulse');
            setTimeout(() => button.classList.remove('jiffy-pulse'), 2000);

            // Get input values
            const containerL = parseFloat(document.getElementById('containerLength').value);
            const containerW = parseFloat(document.getElementById('containerWidth').value);
            const containerH = parseFloat(document.getElementById('containerHeight').value);
            
            const boxL = parseFloat(document.getElementById('boxLength').value);
            const boxW = parseFloat(document.getElementById('boxWidth').value);
            const boxH = parseFloat(document.getElementById('boxHeight').value);
            
            const allowRotation = document.getElementById('allowRotation').checked;
            const selectedPattern = document.querySelector('input[name="layoutPattern"]:checked').value;

            // Basic validation
            if (!boxL || !boxW || !boxH || boxL <= 0 || boxW <= 0 || boxH <= 0) {
                showJiffyAlert('Mohon isi semua ukuran MC dengan benar!', 'error');
                return;
            }

            // Show loading state
            document.getElementById('resultsContainer').innerHTML = `
                <div class="text-center py-12 jiffy-fade-in">
                    <div class="loading-spinner mx-auto mb-6"></div>
                    <p class="text-xl font-semibold text-gray-700 mb-2 jiffy-slide-up">Menghitung layout ${selectedPattern}...</p>
                    <div class="w-64 mx-auto bg-gray-200 rounded-full h-2 mb-4">
                        <div class="jiffy-progress-bar h-2 rounded-full"></div>
                    </div>
                    <p class="text-sm text-gray-500 jiffy-fade-in jiffy-stagger-1">AI sedang menganalisis konfigurasi optimal</p>
                    <div class="jiffy-loading-dots mt-4">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;

            // Calculate scenarios
            setTimeout(() => {
                const scenarios = [];
                let optimal;

                if (selectedPattern === 'optimal') {
                    const normal = calculateScenario(containerL, containerW, containerH, boxL, boxW, boxH, 'Normal', false);
                    scenarios.push(normal);

                    if (allowRotation) {
                        const rotated = calculateScenario(containerL, containerW, containerH, boxW, boxL, boxH, 'Rotasi 90°', true);
                        scenarios.push(rotated);
                        
                        const mixed = calculateMixedLayout(containerL, containerW, containerH, boxL, boxW, boxH);
                        scenarios.push(mixed);
                    }

                    optimal = scenarios.reduce((best, current) => 
                        current.totalBoxes > best.totalBoxes ? current : best
                    );
                } else {
                    switch (selectedPattern) {
                        case 'normal':
                            optimal = calculateScenario(containerL, containerW, containerH, boxL, boxW, boxH, 'Normal', false);
                            break;
                        case 'zigzag':
                            optimal = calculateZigZagLayout(containerL, containerW, containerH, boxL, boxW, boxH);
                            break;
                        case 'offset':
                            optimal = calculateOffsetLayout(containerL, containerW, containerH, boxL, boxW, boxH);
                            break;
                    }
                    scenarios.push(optimal);
                }

                // Calculate metrics
                const containerVolume = containerL * containerW * containerH;
                const boxVolume = boxL * boxW * boxH;
                const wastedSpace = containerVolume - (optimal.totalBoxes * boxVolume);

                calculationResults = {
                    scenarios: scenarios,
                    optimal: optimal,
                    containerDimensions: { length: containerL, width: containerW, height: containerH },
                    boxDimensions: { length: boxL, width: boxW, height: boxH },
                    metrics: {
                        containerVolume: containerVolume,
                        boxVolume: boxVolume,
                        wastedSpace: wastedSpace,
                        spaceSavings: ((optimal.totalBoxes * boxVolume) / containerVolume * 100).toFixed(1)
                    }
                };

                displayResults();
                createVisualization();
                showJiffyAlert('Perhitungan selesai! ', 'success');
            }, 2000);
        }

        function calculateScenario(containerL, containerW, containerH, boxL, boxW, boxH, name, isRotated = false) {
            const boxesPerWidth = Math.floor(containerW / boxW);
            const boxesPerHeight = Math.floor(containerH / boxH);
            const boxesPerLayer = boxesPerWidth * boxesPerHeight;
            const layers = Math.floor(containerL / boxL);
            const totalBoxes = boxesPerLayer * layers;
            
            const usedVolume = totalBoxes * (boxL * boxW * boxH);
            const containerVolume = containerL * containerW * containerH;
            const efficiency = (usedVolume / containerVolume) * 100;

            return {
                name: name,
                boxesPerRow: boxesPerWidth,
                boxesPerCol: boxesPerHeight,
                boxesPerLayer: boxesPerLayer,
                layers: layers,
                totalBoxes: totalBoxes,
                efficiency: efficiency.toFixed(1),
                layout: generateLayoutPattern(boxesPerWidth, boxesPerHeight, layers, isRotated)
            };
        }

        function calculateMixedLayout(containerL, containerW, containerH, boxL, boxW, boxH) {
            let bestResult = { totalBoxes: 0 };
            
            const normalPerWidth = Math.floor(containerW / boxW);
            const normalPerHeight = Math.floor(containerH / boxH);
            const rotatedPerWidth = Math.floor(containerW / boxL);
            const rotatedPerHeight = Math.floor(containerH / boxW);
            
            for (let normalHeight = 0; normalHeight <= normalPerHeight; normalHeight++) {
                const remainingHeight = containerH - (normalHeight * boxH);
                const rotatedHeight = Math.floor(remainingHeight / boxW);
                
                const totalBoxesPerLayer = (normalHeight * normalPerWidth) + (rotatedHeight * rotatedPerWidth);
                const layers = Math.floor(containerL / boxL);
                const totalBoxes = totalBoxesPerLayer * layers;
                
                if (totalBoxes > bestResult.totalBoxes) {
                    const usedVolume = totalBoxes * (boxL * boxW * boxH);
                    const containerVolume = containerL * containerW * containerH;
                    const efficiency = (usedVolume / containerVolume) * 100;
                    
                    bestResult = {
                        name: 'Kombinasi Optimal',
                        boxesPerRow: Math.max(normalPerWidth, rotatedPerWidth),
                        boxesPerCol: normalHeight + rotatedHeight,
                        boxesPerLayer: totalBoxesPerLayer,
                        layers: layers,
                        totalBoxes: totalBoxes,
                        efficiency: efficiency.toFixed(1),
                        layout: generateMixedLayoutPattern(normalPerWidth, rotatedPerWidth, normalHeight, rotatedHeight, layers)
                    };
                }
            }
            
            return bestResult;
        }

        function calculateZigZagLayout(containerL, containerW, containerH, boxL, boxW, boxH) {
            const normalPerWidth = Math.floor(containerW / boxW);
            const rotatedPerWidth = Math.floor(containerW / boxL);
            
            let totalHeight = 0;
            let currentHeight = 0;
            let alternateNormal = true;
            
            while (currentHeight < containerH) {
                const nextRowHeight = alternateNormal ? boxH : boxW;
                if (currentHeight + nextRowHeight <= containerH) {
                    currentHeight += nextRowHeight;
                    totalHeight++;
                    alternateNormal = !alternateNormal;
                } else {
                    break;
                }
            }
            
            const normalRowCount = Math.ceil(totalHeight / 2);
            const rotatedRowCount = Math.floor(totalHeight / 2);
            const boxesPerLayer = (normalRowCount * normalPerWidth) + (rotatedRowCount * rotatedPerWidth);
            const layers = Math.floor(containerL / boxL);
            const totalBoxes = boxesPerLayer * layers;
            
            const usedVolume = totalBoxes * (boxL * boxW * boxH);
            const containerVolume = containerL * containerW * containerH;
            const efficiency = (usedVolume / containerVolume) * 100;
            
            return {
                name: 'Pola Zig-Zag',
                boxesPerRow: Math.max(normalPerWidth, rotatedPerWidth),
                boxesPerCol: totalHeight,
                boxesPerLayer: boxesPerLayer,
                layers: layers,
                totalBoxes: totalBoxes,
                efficiency: efficiency.toFixed(1),
                layout: generateZigZagLayoutPattern(normalPerWidth, rotatedPerWidth, normalRowCount, rotatedRowCount, layers)
            };
        }

        function calculateOffsetLayout(containerL, containerW, containerH, boxL, boxW, boxH) {
            const boxesPerWidth = Math.floor(containerW / boxW);
            const boxesPerHeight = Math.floor(containerH / boxH);
            
            const offsetShift = boxW / 2;
            const offsetBoxesPerWidth = Math.floor((containerW - offsetShift) / boxW);
            
            const fullRows = Math.ceil(boxesPerHeight / 2);
            const offsetRows = Math.floor(boxesPerHeight / 2);
            
            const boxesPerLayer = (fullRows * boxesPerWidth) + (offsetRows * offsetBoxesPerWidth);
            const layers = Math.floor(containerL / boxL);
            const totalBoxes = boxesPerLayer * layers;
            
            const usedVolume = totalBoxes * (boxL * boxW * boxH);
            const containerVolume = containerL * containerW * containerH;
            const efficiency = (usedVolume / containerVolume) * 100;
            
            return {
                name: 'Pola Offset',
                boxesPerRow: boxesPerWidth,
                boxesPerCol: boxesPerHeight,
                boxesPerLayer: boxesPerLayer,
                layers: layers,
                totalBoxes: totalBoxes,
                efficiency: efficiency.toFixed(1),
                layout: generateOffsetLayoutPattern(boxesPerWidth, offsetBoxesPerWidth, fullRows, offsetRows, layers)
            };
        }

        function generateLayoutPattern(boxesPerRow, boxesPerCol, layers, isRotated) {
            const pattern = [];
            for (let layer = 0; layer < layers; layer++) {
                const layerPattern = [];
                for (let col = 0; col < boxesPerCol; col++) {
                    const row = [];
                    for (let r = 0; r < boxesPerRow; r++) {
                        row.push({ rotated: isRotated, type: isRotated ? 'rotated' : 'normal' });
                    }
                    layerPattern.push(row);
                }
                pattern.push(layerPattern);
            }
            return pattern;
        }

        function generateMixedLayoutPattern(normalPerRow, rotatedPerRow, normalRows, rotatedRows, layers) {
            const pattern = [];
            for (let layer = 0; layer < layers; layer++) {
                const layerPattern = [];
                
                for (let col = 0; col < normalRows; col++) {
                    const row = [];
                    for (let r = 0; r < normalPerRow; r++) {
                        row.push({ rotated: false, type: 'normal' });
                    }
                    layerPattern.push(row);
                }
                
                for (let col = 0; col < rotatedRows; col++) {
                    const row = [];
                    for (let r = 0; r < rotatedPerRow; r++) {
                        row.push({ rotated: true, type: 'rotated' });
                    }
                    layerPattern.push(row);
                }
                
                pattern.push(layerPattern);
            }
            return pattern;
        }

        function generateZigZagLayoutPattern(normalPerRow, rotatedPerRow, normalRowCount, rotatedRowCount, layers) {
            const pattern = [];
            for (let layer = 0; layer < layers; layer++) {
                const layerPattern = [];
                let isNormalRow = true;
                
                for (let row = 0; row < (normalRowCount + rotatedRowCount); row++) {
                    const rowPattern = [];
                    const boxesInThisRow = isNormalRow ? normalPerRow : rotatedPerRow;
                    
                    for (let col = 0; col < boxesInThisRow; col++) {
                        rowPattern.push({ 
                            rotated: !isNormalRow, 
                            type: isNormalRow ? 'normal' : 'rotated',
                            zigzag: true 
                        });
                    }
                    
                    layerPattern.push(rowPattern);
                    isNormalRow = !isNormalRow;
                }
                
                pattern.push(layerPattern);
            }
            return pattern;
        }

        function generateOffsetLayoutPattern(boxesPerRow, offsetBoxesPerRow, fullRows, offsetRows, layers) {
            const pattern = [];
            for (let layer = 0; layer < layers; layer++) {
                const layerPattern = [];
                let isFullRow = true;
                
                for (let row = 0; row < (fullRows + offsetRows); row++) {
                    const rowPattern = [];
                    const boxesInThisRow = isFullRow ? boxesPerRow : offsetBoxesPerRow;
                    
                    for (let col = 0; col < boxesInThisRow; col++) {
                        rowPattern.push({ 
                            rotated: false, 
                            type: 'normal',
                            offset: !isFullRow,
                            offsetShift: !isFullRow ? 0.5 : 0
                        });
                    }
                    
                    layerPattern.push(rowPattern);
                    isFullRow = !isFullRow;
                }
                
                pattern.push(layerPattern);
            }
            return pattern;
        }

        function displayResults() {
            const container = document.getElementById('resultsContainer');
            const { scenarios, optimal, metrics } = calculationResults;
            
            let html = `
                <div class="p-6 rounded-2xl border-l-4 border-green-500 mb-8 jiffy-success" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1));">
                    <h3 class="text-2xl font-bold text-green-800 mb-4 flex items-center">
                        <span class="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white mr-3 jiffy-pulse">🏆</span>
                        Layout Optimal: ${optimal.name}
                    </h3>
                    <div class="grid grid-cols-2 gap-6 mb-6">
                        <div class="text-center jiffy-bounce jiffy-stagger-1">
                            <div class="text-4xl font-bold gradient-text">${optimal.totalBoxes}</div>
                            <div class="text-sm font-semibold text-gray-600">Total MC</div>
                        </div>
                        <div class="text-center jiffy-bounce jiffy-stagger-2">
                            <div class="text-4xl font-bold gradient-text">${optimal.efficiency}%</div>
                            <div class="text-sm font-semibold text-gray-600">Efisiensi</div>
                        </div>
                        <div class="text-center jiffy-bounce jiffy-stagger-3">
                            <div class="text-2xl font-bold text-gray-700">${optimal.boxesPerLayer}</div>
                            <div class="text-sm font-semibold text-gray-600">MC per Sap</div>
                        </div>
                        <div class="text-center jiffy-bounce jiffy-stagger-4">
                            <div class="text-2xl font-bold text-gray-700">${optimal.layers}</div>
                            <div class="text-sm font-semibold text-gray-600">Jumlah Sap</div>
                        </div>
                    </div>
                </div>

                <div class="p-6 rounded-2xl mb-8 jiffy-slide-up" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05));">
                    <h4 class="text-2xl font-bold text-blue-800 mb-6 flex items-center">
                        <span class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white mr-3 jiffy-pulse">📊</span>
                        Analisis Mendalam
                    </h4>
                    <div class="grid grid-cols-2 gap-6">
                        <div class="metric-card p-4 rounded-xl jiffy-hover-lift jiffy-fade-in jiffy-stagger-1">
                            <div class="text-gray-600 font-semibold mb-1">Volume Kontainer</div>
                            <div class="text-2xl font-bold gradient-text">${(metrics.containerVolume / 1000000).toFixed(2)} m³</div>
                        </div>
                        <div class="metric-card p-4 rounded-xl jiffy-hover-lift jiffy-fade-in jiffy-stagger-2">
                            <div class="text-gray-600 font-semibold mb-1">Volume Terpakai</div>
                            <div class="text-2xl font-bold text-green-600">${metrics.spaceSavings}%</div>
                        </div>
                        <div class="metric-card p-4 rounded-xl jiffy-hover-lift jiffy-fade-in jiffy-stagger-3">
                            <div class="text-gray-600 font-semibold mb-1">Ruang Terbuang</div>
                            <div class="text-2xl font-bold text-red-600">${(metrics.wastedSpace / 1000000).toFixed(2)} m³</div>
                        </div>
                        <div class="metric-card p-4 rounded-xl jiffy-hover-lift jiffy-fade-in jiffy-stagger-4">
                            <div class="text-gray-600 font-semibold mb-1">MC per m³</div>
                            <div class="text-2xl font-bold text-purple-600">${(optimal.totalBoxes / (metrics.containerVolume / 1000000)).toFixed(0)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4 jiffy-slide-up">
                    <h4 class="text-xl font-bold text-gray-700 flex items-center">
                        <span class="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-700 rounded-full flex items-center justify-center text-white text-sm mr-3 jiffy-pulse">📋</span>
                        Perbandingan Semua Skenario
                    </h4>
            `;
            
            scenarios.forEach((scenario, index) => {
                const isOptimal = scenario === optimal;
                html += `
                    <div class="p-4 rounded-xl border-2 ${isOptimal ? 'border-green-300' : 'border-gray-200'} jiffy-fade-in jiffy-stagger-${index + 1} jiffy-hover-lift" style="background: ${isOptimal ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(59, 130, 246, 0.05))' : 'rgba(255, 255, 255, 0.8)'};">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-lg font-bold ${isOptimal ? 'text-green-800' : 'text-gray-700'}">${scenario.name}</span>
                            ${isOptimal ? '<span class="bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold jiffy-bounce">OPTIMAL ✨</span>' : ''}
                        </div>
                        <div class="grid grid-cols-4 gap-4 text-sm">
                            <div class="text-center">
                                <div class="font-bold text-xl ${isOptimal ? 'text-green-600' : 'text-gray-700'}">${scenario.totalBoxes}</div>
                                <div class="text-gray-600">Total</div>
                            </div>
                            <div class="text-center">
                                <div class="font-bold text-lg text-gray-700">${scenario.boxesPerLayer}</div>
                                <div class="text-gray-600">Per Sap</div>
                            </div>
                            <div class="text-center">
                                <div class="font-bold text-lg text-gray-700">${scenario.layers}</div>
                                <div class="text-gray-600">Jumlah Sap</div>
                            </div>
                            <div class="text-center">
                                <div class="font-bold text-lg ${isOptimal ? 'text-blue-600' : 'text-gray-700'}">${scenario.efficiency}%</div>
                                <div class="text-gray-600">Efisiensi</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
        }

        function createVisualization() {
            const enable3D = document.getElementById('enable3D').checked;
            
            if (enable3D) {
                currentVisualizationMode = '3d';
                document.getElementById('toggle3DMode').textContent = '📋 Mode 2D';
                document.getElementById('threeDControls').classList.remove('hidden');
                document.getElementById('threeDControls').classList.add('jiffy-zoom-in');
                init3DVisualization();
            } else {
                currentVisualizationMode = '2d';
                document.getElementById('toggle3DMode').textContent = '🎮 Mode 3D';
                document.getElementById('threeDControls').classList.add('hidden');
                create2DVisualization();
            }
            
            setupLayerControls();
        }

        function toggle3DVisualization() {
            if (currentVisualizationMode === '2d') {
                currentVisualizationMode = '3d';
                document.getElementById('toggle3DMode').textContent = '📋 Mode 2D';
                document.getElementById('toggle3DMode').classList.add('jiffy-bounce');
                setTimeout(() => document.getElementById('toggle3DMode').classList.remove('jiffy-bounce'), 600);
                
                if (calculationResults) {
                    document.getElementById('threeDControls').classList.remove('hidden');
                    document.getElementById('threeDControls').classList.add('jiffy-zoom-in');
                    init3DVisualization();
                }
            } else {
                currentVisualizationMode = '2d';
                document.getElementById('toggle3DMode').textContent = '🎮 Mode 3D';
                document.getElementById('toggle3DMode').classList.add('jiffy-bounce');
                setTimeout(() => document.getElementById('toggle3DMode').classList.remove('jiffy-bounce'), 600);
                
                document.getElementById('threeDControls').classList.add('hidden');
                cleanup3D();
                if (calculationResults) {
                    create2DVisualization();
                }
            }
        }

        function init3DVisualization() {
            if (!calculationResults) return;

            cleanup3D();

            const container = document.getElementById('visualizationContainer');
            container.style.display = 'none';
            
            const threejsContainer = document.getElementById('threejs-container');
            threejsContainer.style.display = 'block';
            threejsContainer.classList.add('jiffy-zoom-in');
            
            // Setup Three.js scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf8fafc);

            // Camera
            camera = new THREE.PerspectiveCamera(75, threejsContainer.clientWidth / 600, 0.1, 1000);
            camera.position.set(50, 50, 50);

            // Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(threejsContainer.clientWidth, 600);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            threejsContainer.appendChild(renderer.domElement);

            // Controls
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(50, 50, 25);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            scene.add(directionalLight);

            // Create container wireframe
            createContainer3D();
            
            // Create boxes
            createBoxes3D();

            // Start animation loop
            animate3D();
        }

        function createContainer3D() {
            const { containerDimensions } = calculationResults;
            
            // Create container group
            containerMesh = new THREE.Group();
            
            // Container dimensions in Three.js units (scaled down by 10)
            const length = containerDimensions.length / 10;
            const width = containerDimensions.width / 10;
            const height = containerDimensions.height / 10;
            
            // Create realistic 40ft FCL container structure
            
            // 1. FLOOR - Realistic container floor with wooden planks texture
            const floorGeometry = new THREE.BoxGeometry(length, 0.5, width);
            
            // Create wooden floor texture using canvas
            const floorCanvas = document.createElement('canvas');
            floorCanvas.width = 512;
            floorCanvas.height = 512;
            const floorCtx = floorCanvas.getContext('2d');
            
            // Base wood color
            floorCtx.fillStyle = '#8B4513';
            floorCtx.fillRect(0, 0, 512, 512);
            
            // Wood grain pattern
            for (let i = 0; i < 512; i += 32) {
                floorCtx.fillStyle = i % 64 === 0 ? '#654321' : '#A0522D';
                floorCtx.fillRect(i, 0, 32, 512);
                
                // Add wood grain lines
                floorCtx.strokeStyle = '#5D4037';
                floorCtx.lineWidth = 1;
                for (let j = 0; j < 512; j += 8) {
                    floorCtx.beginPath();
                    floorCtx.moveTo(i, j);
                    floorCtx.lineTo(i + 32, j + Math.random() * 4);
                    floorCtx.stroke();
                }
            }
            
            const floorTexture = new THREE.CanvasTexture(floorCanvas);
            floorTexture.wrapS = THREE.RepeatWrapping;
            floorTexture.wrapT = THREE.RepeatWrapping;
            floorTexture.repeat.set(length / 10, width / 10);
            
            const floorMaterial = new THREE.MeshPhongMaterial({
                map: floorTexture,
                color: 0x8B4513,
                shininess: 10
            });
            
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.position.set(length/2, 0.25, width/2);
            floor.receiveShadow = true;
            containerMesh.add(floor);
            
            // 2. WALLS - Realistic corrugated steel container walls
            const wallThickness = 0.3;
            
            // Create corrugated metal texture
            const wallCanvas = document.createElement('canvas');
            wallCanvas.width = 512;
            wallCanvas.height = 512;
            const wallCtx = wallCanvas.getContext('2d');
            
            // Base metal color
            wallCtx.fillStyle = '#4A5568';
            wallCtx.fillRect(0, 0, 512, 512);
            
            // Corrugated pattern
            for (let i = 0; i < 512; i += 16) {
                const shade = i % 32 === 0 ? '#2D3748' : '#718096';
                wallCtx.fillStyle = shade;
                wallCtx.fillRect(i, 0, 8, 512);
                
                // Add vertical ridges
                wallCtx.strokeStyle = '#1A202C';
                wallCtx.lineWidth = 1;
                wallCtx.beginPath();
                wallCtx.moveTo(i, 0);
                wallCtx.lineTo(i, 512);
                wallCtx.stroke();
            }
            
            // Add rust spots and wear
            for (let i = 0; i < 20; i++) {
                wallCtx.fillStyle = `rgba(139, 69, 19, ${0.3 + Math.random() * 0.4})`;
                wallCtx.beginPath();
                wallCtx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 15 + 5, 0, Math.PI * 2);
                wallCtx.fill();
            }
            
            const wallTexture = new THREE.CanvasTexture(wallCanvas);
            wallTexture.wrapS = THREE.RepeatWrapping;
            wallTexture.wrapT = THREE.RepeatWrapping;
            
            const wallMaterial = new THREE.MeshPhongMaterial({
                map: wallTexture,
                color: 0x4A5568,
                shininess: 30,
                transparent: true,
                opacity: 0.9
            });
            
            // Left wall
            const leftWallGeometry = new THREE.BoxGeometry(wallThickness, height, width);
            const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
            leftWall.position.set(wallThickness/2, height/2, width/2);
            containerMesh.add(leftWall);
            
            // Right wall
            const rightWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
            rightWall.position.set(length - wallThickness/2, height/2, width/2);
            containerMesh.add(rightWall);
            
            // Front wall (solid for reefer container)
            const frontWallGeometry = new THREE.BoxGeometry(length, height, wallThickness);
            const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
            frontWall.position.set(length/2, height/2, wallThickness/2);
            containerMesh.add(frontWall);
            
            // REEFER CONTAINER - Doors at the back
            const doorWidth = width * 0.45; // Door width based on container width
            const doorHeight = height - 2;
            
            // Left door (at back) - positioned for sideways opening
            const leftDoorGeometry = new THREE.BoxGeometry(wallThickness, doorHeight, doorWidth);
            const leftDoor = new THREE.Mesh(leftDoorGeometry, wallMaterial);
            leftDoor.position.set(length - wallThickness/2, doorHeight/2 + 1, doorWidth/2);
            leftDoor.userData = { isLeftDoor: true, isOpen: false };
            // Set pivot point for proper hinge rotation
            leftDoor.geometry.translate(0, 0, -doorWidth/2);
            containerMesh.add(leftDoor);
            
            // Right door (at back) - positioned for sideways opening
            const rightDoor = new THREE.Mesh(leftDoorGeometry, wallMaterial);
            rightDoor.position.set(length - wallThickness/2, doorHeight/2 + 1, width - doorWidth/2);
            rightDoor.userData = { isRightDoor: true, isOpen: false };
            // Set pivot point for proper hinge rotation
            rightDoor.geometry.translate(0, 0, doorWidth/2);
            containerMesh.add(rightDoor);
            
            // Door handles (horizontal orientation for back doors opening sideways)
            const handleGeometry = new THREE.CylinderGeometry(0.5, 0.5, 3, 8);
            const handleMaterial = new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 100 });
            
            const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial);
            leftHandle.rotation.z = Math.PI / 2; // Horizontal handle
            leftHandle.position.set(length + 1, doorHeight/2 + 1, doorWidth - 3);
            containerMesh.add(leftHandle);
            
            const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial);
            rightHandle.rotation.z = Math.PI / 2; // Horizontal handle
            rightHandle.position.set(length + 1, doorHeight/2 + 1, width - doorWidth + 3);
            containerMesh.add(rightHandle);
            
            // Door hinges (vertical for back doors opening sideways)
            const hingeGeometry = new THREE.CylinderGeometry(0.4, 0.4, doorHeight * 0.8, 8);
            const hingeMaterial = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 80 });
            
            // Left door hinges (vertical, at the left edge of left door)
            const leftHinge1 = new THREE.Mesh(hingeGeometry, hingeMaterial);
            leftHinge1.position.set(length - 0.5, doorHeight/2 + 1, 2);
            containerMesh.add(leftHinge1);
            
            // Right door hinges (vertical, at the right edge of right door)
            const rightHinge1 = new THREE.Mesh(hingeGeometry, hingeMaterial);
            rightHinge1.position.set(length - 0.5, doorHeight/2 + 1, width - 2);
            containerMesh.add(rightHinge1);
            
            // Door locks/latches (center of back doors)
            const lockGeometry = new THREE.BoxGeometry(1, 1, 2);
            const lockMaterial = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 100 });
            
            const centerLock = new THREE.Mesh(lockGeometry, lockMaterial);
            centerLock.position.set(length + 0.8, doorHeight/2 + 1, width/2);
            containerMesh.add(centerLock);
            
            // Store door references for animation
            containerMesh.userData.leftDoor = leftDoor;
            containerMesh.userData.rightDoor = rightDoor;
            containerMesh.userData.leftHandle = leftHandle;
            containerMesh.userData.rightHandle = rightHandle;
            containerMesh.userData.hinges = [leftHinge1, rightHinge1];
            containerMesh.userData.lock = centerLock;
            
            // Top frame (no roof for loading visibility)
            const frameGeometry = new THREE.BoxGeometry(length, 0.5, wallThickness);
            const topFrame = new THREE.Mesh(frameGeometry, wallMaterial);
            topFrame.position.set(length/2, height + 0.25, wallThickness/2);
            containerMesh.add(topFrame);
            
            // REEFER COOLING UNIT at front
            const coolingUnitGeometry = new THREE.BoxGeometry(length * 0.8, height * 0.3, 4);
            const coolingUnitMaterial = new THREE.MeshPhongMaterial({
                color: 0x2D3748,
                shininess: 80
            });
            const coolingUnit = new THREE.Mesh(coolingUnitGeometry, coolingUnitMaterial);
            coolingUnit.position.set(length/2, height * 0.85, -2);
            containerMesh.add(coolingUnit);
            
            // Cooling unit vents
            for (let i = 0; i < 8; i++) {
                const ventGeometry = new THREE.BoxGeometry(length * 0.08, height * 0.02, 0.2);
                const ventMaterial = new THREE.MeshPhongMaterial({ color: 0x1A202C });
                const vent = new THREE.Mesh(ventGeometry, ventMaterial);
                vent.position.set((length * 0.2) + (i * length * 0.08), height * 0.85, -4.1);
                containerMesh.add(vent);
            }
            
            // Temperature display panel
            const panelGeometry = new THREE.BoxGeometry(8, 4, 0.5);
            const panelMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
            const panel = new THREE.Mesh(panelGeometry, panelMaterial);
            panel.position.set(length * 0.8, height * 0.7, -4.2);
            containerMesh.add(panel);
            
            // Digital display
            const displayCanvas = document.createElement('canvas');
            displayCanvas.width = 128;
            displayCanvas.height = 64;
            const displayCtx = displayCanvas.getContext('2d');
            
            displayCtx.fillStyle = '#00FF00';
            displayCtx.fillRect(0, 0, 128, 64);
            displayCtx.fillStyle = '#000000';
            displayCtx.font = 'bold 16px monospace';
            displayCtx.textAlign = 'center';
            displayCtx.fillText('TEMP', 64, 20);
            displayCtx.fillText('-18°C', 64, 40);
            displayCtx.fillText('ACTIVE', 64, 55);
            
            const displayTexture = new THREE.CanvasTexture(displayCanvas);
            const displayMaterial = new THREE.MeshPhongMaterial({
                map: displayTexture,
                emissive: 0x002200
            });
            
            const displayGeometry = new THREE.PlaneGeometry(6, 3);
            const display = new THREE.Mesh(displayGeometry, displayMaterial);
            display.position.set(length * 0.8, height * 0.7, -4.1);
            containerMesh.add(display);
            
            // 3. CONTAINER MARKINGS AND DETAILS
            
            // Add container corner posts
            const cornerPostGeometry = new THREE.BoxGeometry(1, height + 1, 1);
            const cornerPostMaterial = new THREE.MeshPhongMaterial({
                color: 0x2D3748,
                shininess: 50
            });
            
            // Four corner posts
            const corners = [
                [0.5, (height + 1)/2, 0.5],
                [length - 0.5, (height + 1)/2, 0.5],
                [0.5, (height + 1)/2, width - 0.5],
                [length - 0.5, (height + 1)/2, width - 0.5]
            ];
            
            corners.forEach(pos => {
                const post = new THREE.Mesh(cornerPostGeometry, cornerPostMaterial);
                post.position.set(pos[0], pos[1], pos[2]);
                containerMesh.add(post);
            });
            
            // Add container number/marking on the SIDE WALLS (always visible)
            const markingCanvas = document.createElement('canvas');
            markingCanvas.width = 256;
            markingCanvas.height = 128;
            const markingCtx = markingCanvas.getContext('2d');
            
            markingCtx.fillStyle = '#4A5568';
            markingCtx.fillRect(0, 0, 256, 128);
            
            markingCtx.fillStyle = '#FFFFFF';
            markingCtx.font = 'bold 24px Arial';
            markingCtx.textAlign = 'center';
            markingCtx.fillText('HITUNG', 128, 35);
            markingCtx.fillText('CONTAINER', 128, 60);
            markingCtx.fillText('PPIC-WKB', 128, 90);
            
            const markingTexture = new THREE.CanvasTexture(markingCanvas);
            const markingMaterial = new THREE.MeshPhongMaterial({
                map: markingTexture,
                transparent: true
            });
            
            // Left side wall marking - ATTACHED TO CONTAINER (always visible)
            const leftSideMarkingGeometry = new THREE.PlaneGeometry(12, 6);
            const leftSideMarking = new THREE.Mesh(leftSideMarkingGeometry, markingMaterial);
            leftSideMarking.position.set(length/2, height/2, -0.2); // On left side wall
            leftSideMarking.rotation.y = Math.PI / 2; // Face outward from left wall
            containerMesh.add(leftSideMarking); // ATTACH TO CONTAINER - always visible
            
            // Right side wall marking - ATTACHED TO CONTAINER (always visible)
            const rightSideMarkingGeometry = new THREE.PlaneGeometry(12, 6);
            const rightSideMarking = new THREE.Mesh(rightSideMarkingGeometry, markingMaterial);
            rightSideMarking.position.set(length/2, height/2, width + 0.2); // On right side wall
            rightSideMarking.rotation.y = -Math.PI / 2; // Face outward from right wall
            containerMesh.add(rightSideMarking); // ATTACH TO CONTAINER - always visible
            
            // 4. CONTAINER WIREFRAME OUTLINE
            const outlineGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(length, height, width));
            const outlineMaterial = new THREE.LineBasicMaterial({
                color: 0x1A202C,
                linewidth: 3,
                transparent: true,
                opacity: 0.8
            });
            const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
            outline.position.set(length/2, height/2, width/2);
            containerMesh.add(outline);
            
            // Position the entire container
            containerMesh.position.set(0, 0, 0);
            scene.add(containerMesh);
        }

        function createBoxes3D() {
            const { optimal, boxDimensions } = calculationResults;
            const showAllLayers = document.getElementById('showAllLayers').checked;
            const currentLayer = parseInt(document.getElementById('layerSlider').value) - 1;
            
            boxMeshes.forEach(mesh => scene.remove(mesh));
            boxMeshes = [];

            const layersToShow = showAllLayers ? optimal.layers : 1;
            const startLayer = showAllLayers ? 0 : currentLayer;
            const endLayer = showAllLayers ? optimal.layers : currentLayer + 1;

            for (let layerIndex = startLayer; layerIndex < endLayer && layerIndex < optimal.layout.length; layerIndex++) {
                const layer = optimal.layout[layerIndex];
                
                layer.forEach((row, rowIndex) => {
                    row.forEach((box, colIndex) => {
                        const boxGeometry = new THREE.BoxGeometry(
                            (box.rotated ? boxDimensions.width : boxDimensions.length) / 10,
                            boxDimensions.height / 10,
                            (box.rotated ? boxDimensions.length : boxDimensions.width) / 10
                        );

                        // Enhanced colors and materials
                        let color = 0x3b82f6; // Normal blue
                        let emissive = 0x1e40af;
                        if (box.rotated) {
                            color = 0xef4444; // Rotated red
                            emissive = 0xb91c1c;
                        } else if (box.zigzag) {
                            color = 0x8b5cf6; // Zigzag purple
                            emissive = 0x6d28d9;
                        } else if (box.offset) {
                            color = 0x10b981; // Offset green
                            emissive = 0x047857;
                        }

                        // Create realistic browncraft cardboard box material
                        const boxCanvas = document.createElement('canvas');
                        boxCanvas.width = 256;
                        boxCanvas.height = 256;
                        const boxCtx = boxCanvas.getContext('2d');
                        
                        // Base browncraft cardboard color
                        const baseColor = box.rotated ? '#8B4513' : '#D2B48C'; // Darker brown for rotated
                        boxCtx.fillStyle = baseColor;
                        boxCtx.fillRect(0, 0, 256, 256);
                        
                        // Add cardboard texture with corrugated pattern
                        for (let i = 0; i < 256; i += 8) {
                            const shade = i % 16 === 0 ? 'rgba(139, 69, 19, 0.3)' : 'rgba(160, 82, 45, 0.2)';
                            boxCtx.fillStyle = shade;
                            boxCtx.fillRect(i, 0, 4, 256);
                        }
                        
                        // Add vertical corrugated lines
                        for (let i = 0; i < 256; i += 16) {
                            boxCtx.strokeStyle = 'rgba(101, 67, 33, 0.6)';
                            boxCtx.lineWidth = 1;
                            boxCtx.beginPath();
                            boxCtx.moveTo(i, 0);
                            boxCtx.lineTo(i, 256);
                            boxCtx.stroke();
                        }
                        
                        // Add wear and tear spots
                        for (let i = 0; i < 8; i++) {
                            boxCtx.fillStyle = `rgba(101, 67, 33, ${0.2 + Math.random() * 0.3})`;
                            boxCtx.beginPath();
                            boxCtx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 8 + 3, 0, Math.PI * 2);
                            boxCtx.fill();
                        }
                        
                        // Add tape lines for box sealing
                        boxCtx.strokeStyle = 'rgba(255, 215, 0, 0.8)'; // Golden tape color
                        boxCtx.lineWidth = 6;
                        boxCtx.beginPath();
                        boxCtx.moveTo(0, 128);
                        boxCtx.lineTo(256, 128);
                        boxCtx.stroke();
                        
                        // Add vertical tape
                        boxCtx.beginPath();
                        boxCtx.moveTo(128, 0);
                        boxCtx.lineTo(128, 256);
                        boxCtx.stroke();
                        
                        // Add box orientation indicator
                        if (box.rotated) {
                            // Rotation arrow for rotated boxes
                            boxCtx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                            boxCtx.lineWidth = 4;
                            boxCtx.beginPath();
                            boxCtx.arc(64, 64, 20, 0, Math.PI * 1.5);
                            boxCtx.stroke();
                            
                            // Arrow head
                            boxCtx.beginPath();
                            boxCtx.moveTo(84, 64);
                            boxCtx.lineTo(78, 58);
                            boxCtx.moveTo(84, 64);
                            boxCtx.lineTo(78, 70);
                            boxCtx.stroke();
                        }
                        
                        // Add shipping label
                        boxCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                        boxCtx.fillRect(160, 160, 80, 60);
                        boxCtx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                        boxCtx.lineWidth = 2;
                        boxCtx.strokeRect(160, 160, 80, 60);
                        
                        // Label text
                        boxCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                        boxCtx.font = 'bold 12px Arial';
                        boxCtx.textAlign = 'center';
                        boxCtx.fillText('FRAGILE', 200, 180);
                        boxCtx.font = '10px Arial';
                        boxCtx.fillText(`S${layerIndex + 1}-${rowIndex + 1}-${colIndex + 1}`, 200, 195);
                        boxCtx.fillText(box.rotated ? 'ROTATED' : 'NORMAL', 200, 210);
                        
                        // Add "THIS SIDE UP" arrow if not rotated
                        if (!box.rotated) {
                            boxCtx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                            boxCtx.lineWidth = 3;
                            boxCtx.beginPath();
                            boxCtx.moveTo(40, 200);
                            boxCtx.lineTo(40, 160);
                            boxCtx.moveTo(30, 170);
                            boxCtx.lineTo(40, 160);
                            boxCtx.lineTo(50, 170);
                            boxCtx.stroke();
                            
                            boxCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                            boxCtx.font = 'bold 8px Arial';
                            boxCtx.textAlign = 'center';
                            boxCtx.fillText('THIS', 40, 220);
                            boxCtx.fillText('SIDE', 40, 230);
                            boxCtx.fillText('UP', 40, 240);
                        }
                        
                        const boxTexture = new THREE.CanvasTexture(boxCanvas);
                        boxTexture.wrapS = THREE.RepeatWrapping;
                        boxTexture.wrapT = THREE.RepeatWrapping;
                        
                        // Create realistic cardboard material
                        const boxMaterial = new THREE.MeshPhongMaterial({
                            map: boxTexture,
                            color: 0xD2B48C, // Tan/browncraft color
                            shininess: 5, // Low shininess for cardboard
                            transparent: true,
                            opacity: 0.95,
                            side: THREE.DoubleSide
                        });

                        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
                        
                        // Add realistic cardboard edges
                        const edges = new THREE.EdgesGeometry(boxGeometry);
                        const edgeMaterial = new THREE.LineBasicMaterial({ 
                            color: 0x8B4513, // Dark brown edges
                            linewidth: 2,
                            transparent: true,
                            opacity: 0.9
                        });
                        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
                        boxMesh.add(wireframe);
                        
                        // Position calculation
                        const boxWidth = (box.rotated ? boxDimensions.width : boxDimensions.length) / 10;
                        const boxDepth = (box.rotated ? boxDimensions.length : boxDimensions.width) / 10;
                        
                        let offsetX = 0;
                        if (box.offset && box.offsetShift) {
                            offsetX = boxWidth * box.offsetShift;
                        }

                        boxMesh.position.set(
                            (layerIndex * boxDimensions.length / 10) + (boxDimensions.length / 20),
                            (rowIndex * boxDimensions.height / 10) + (boxDimensions.height / 20),
                            (colIndex * boxDepth) + (boxDepth / 2) + offsetX
                        );

                        boxMesh.castShadow = true;
                        boxMesh.receiveShadow = true;
                        
                        scene.add(boxMesh);
                        boxMeshes.push(boxMesh);
                    });
                });
            }
        }

        function animate3D() {
            if (currentVisualizationMode !== '3d') return;
            
            animationId = requestAnimationFrame(animate3D);
            controls.update();
            renderer.render(scene, camera);
        }

        function cleanup3D() {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            
            if (renderer) {
                const threejsContainer = document.getElementById('threejs-container');
                if (threejsContainer.contains(renderer.domElement)) {
                    threejsContainer.removeChild(renderer.domElement);
                }
                renderer.dispose();
                renderer = null;
            }
            
            if (scene) {
                boxMeshes.forEach(mesh => scene.remove(mesh));
                boxMeshes = [];
                if (containerMesh) {
                    scene.remove(containerMesh);
                    containerMesh = null;
                }
                scene = null;
            }
            
            camera = null;
            controls = null;
            
            document.getElementById('threejs-container').style.display = 'none';
            document.getElementById('visualizationContainer').style.display = 'flex';
        }

        function create2DVisualization() {
            const container = document.getElementById('visualizationContainer');
            const { optimal, containerDimensions, boxDimensions } = calculationResults;
            
            // Create responsive 2D SVG visualization with professional design
            const containerRect = container.getBoundingClientRect();
            const isMobile = window.innerWidth < 1024;
            const svgWidth = Math.min(containerRect.width - (isMobile ? 48 : 64), isMobile ? 500 : 1000);
            const svgHeight = Math.min(containerRect.height - (isMobile ? 48 : 64), isMobile ? 400 : 700);
            
            // Calculate proper scale to fit container in view with better proportions
            const padding = 120;
            const scaleX = (svgWidth - padding) / containerDimensions.width;
            const scaleY = (svgHeight - padding) / containerDimensions.height;
            const scale = Math.min(scaleX, scaleY, 0.8); // Optimal scale for visibility
            
            const containerWidth = containerDimensions.width * scale;
            const containerHeight = containerDimensions.height * scale;
            
            const showAllLayers = document.getElementById('showAllLayers').checked;
            const currentLayer = parseInt(document.getElementById('layerSlider').value) - 1;
            
            let html = `
                <div class="w-full jiffy-zoom-in" style="background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%); border-radius: 24px; padding: ${isMobile ? '24px' : '40px'}; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);">
                    <div class="mb-6 text-center">
                        <h4 class="text-xl lg:text-2xl font-bold text-white mb-2">📐 Layout Visualization</h4>
                        <p class="text-sm lg:text-base text-slate-300">Tampak belakang kontainer dengan penataan MC optimal</p>
                    </div>
                    
                    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" class="mx-auto" style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 16px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                        <defs>
                            <!-- Professional grid pattern -->
                            <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#cbd5e1" stroke-width="0.5" opacity="0.6"/>
                                <circle cx="0" cy="0" r="1" fill="#94a3b8" opacity="0.3"/>
                            </pattern>
                            
                            <!-- Enhanced shadow filters -->
                            <filter id="boxShadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                                <feOffset dx="2" dy="4" result="offset"/>
                                <feFlood flood-color="#000000" flood-opacity="0.25"/>
                                <feComposite in2="offset" operator="in"/>
                                <feMerge>
                                    <feMergeNode/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                            
                            <filter id="containerGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                            
                            <!-- Gradient definitions for professional look -->
                            <linearGradient id="containerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.1" />
                                <stop offset="50%" style="stop-color:#1d4ed8;stop-opacity:0.05" />
                                <stop offset="100%" style="stop-color:#1e40af;stop-opacity:0.1" />
                            </linearGradient>
                            
                            <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                                <stop offset="50%" style="stop-color:#1d4ed8;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        
                        <!-- Professional grid background -->
                        <rect width="100%" height="100%" fill="url(#grid)" />
                        
                        <!-- Main container group with enhanced positioning -->
                        <g transform="translate(${(svgWidth - containerWidth) / 2}, ${(svgHeight - containerHeight) / 2})">
                            
                            <!-- Container shadow -->
                            <rect x="4" y="6" width="${containerWidth}" height="${containerHeight}" 
                                  fill="#000000" opacity="0.15" rx="12" />
                            
                            <!-- Main container with professional styling -->
                            <rect x="0" y="0" width="${containerWidth}" height="${containerHeight}" 
                                  fill="url(#containerGradient)" stroke="url(#borderGradient)" stroke-width="4" 
                                  rx="12" filter="url(#containerGlow)" />
                            
                            <!-- Container inner border -->
                            <rect x="2" y="2" width="${containerWidth-4}" height="${containerHeight-4}" 
                                  fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1" rx="10" />
                            
                            <!-- Container title with better positioning -->
                            <text x="${containerWidth/2}" y="-35" text-anchor="middle" 
                                  class="${isMobile ? 'text-base' : 'text-xl'} font-bold" 
                                  fill="url(#borderGradient)" style="font-family: 'Inter', sans-serif;">
                                📦 Kontainer ${containerDimensions.width} × ${containerDimensions.height} cm
                            </text>
                            
                            <!-- Dimension labels -->
                            <text x="${containerWidth/2}" y="-15" text-anchor="middle" 
                                  class="${isMobile ? 'text-xs' : 'text-sm'} font-semibold" 
                                  fill="#64748b" style="font-family: 'Inter', sans-serif;">
                                Tampak Belakang • Volume: ${((containerDimensions.length * containerDimensions.width * containerDimensions.height) / 1000000).toFixed(2)} m³
                            </text>
            `;
            
            // Add boxes for current layer(s)
            const layersToShow = showAllLayers ? optimal.layers : 1;
            const startLayer = showAllLayers ? 0 : currentLayer;
            const endLayer = showAllLayers ? optimal.layers : currentLayer + 1;

            for (let layerIndex = startLayer; layerIndex < endLayer && layerIndex < optimal.layout.length; layerIndex++) {
                const layer = optimal.layout[layerIndex];
                const opacity = showAllLayers ? Math.max(0.4, 1 - (layerIndex * 0.1)) : 1;
                
                layer.forEach((row, rowIndex) => {
                    
                    row.forEach((box, colIndex) => {
                        const boxWidth = (box.rotated ? boxDimensions.height : boxDimensions.width) * scale;
                        const boxHeight = (box.rotated ? boxDimensions.width : boxDimensions.height) * scale;
                        
                        let fillColor = '#60a5fa';
                        let strokeColor = '#3b82f6';
                        
                        // Adjust colors based on layer depth when showing all layers
                        if (showAllLayers) {
                            const layerColorIntensity = 1 - (layerIndex * 0.15);
                            if (box.rotated) {
                                fillColor = `rgba(248, 113, 113, ${layerColorIntensity})`;
                                strokeColor = '#ef4444';
                            } else if (box.zigzag) {
                                fillColor = `rgba(167, 139, 250, ${layerColorIntensity})`;
                                strokeColor = '#8b5cf6';
                            } else if (box.offset) {
                                fillColor = `rgba(52, 211, 153, ${layerColorIntensity})`;
                                strokeColor = '#10b981';
                            } else {
                                fillColor = `rgba(96, 165, 250, ${layerColorIntensity})`;
                                strokeColor = '#3b82f6';
                            }
                        } else {
                            if (box.rotated) {
                                fillColor = '#f87171';
                                strokeColor = '#ef4444';
                            } else if (box.zigzag) {
                                fillColor = '#a78bfa';
                                strokeColor = '#8b5cf6';
                            } else if (box.offset) {
                                fillColor = '#34d399';
                                strokeColor = '#10b981';
                            }
                        }
                        
                        // Calculate position with proper spacing and alignment
                        let boxX = colIndex * (boxDimensions.width * scale) + 8; // Add padding
                        let boxY = rowIndex * (boxDimensions.height * scale) + 8; // Add padding
                        
                        // Add depth effect for multiple layers when showing all
                        if (showAllLayers && layerIndex > 0) {
                            boxX += layerIndex * 3; // Slight offset for depth
                            boxY += layerIndex * 3; // Slight offset for depth
                        }
                        
                        // Handle offset positioning
                        if (box.offset && box.offsetShift) {
                            boxX += (boxDimensions.width * scale * box.offsetShift);
                        }
                        
                        // Create enhanced pattern definitions for different box types
                        const patternId = `pattern-${layerIndex}-${rowIndex}-${colIndex}`;
                        const gradientId = `gradient-${layerIndex}-${rowIndex}-${colIndex}`;
                        const glowId = `glow-${layerIndex}-${rowIndex}-${colIndex}`;
                        
                        let patternDef = '';
                        let gradientDef = '';
                        let glowDef = '';
                        
                        if (box.rotated) {
                            patternDef = `
                                <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="12" height="12">
                                    <rect width="12" height="12" fill="${fillColor}"/>
                                    <path d="M0,12 L12,0 M3,12 L12,3 M0,9 L9,0" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
                                </pattern>
                            `;
                            gradientDef = `
                                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
                                    <stop offset="50%" style="stop-color:#dc2626;stop-opacity:1" />
                                    <stop offset="100%" style="stop-color:#b91c1c;stop-opacity:1" />
                                </linearGradient>
                            `;
                            glowDef = `
                                <filter id="${glowId}">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            `;
                        } else if (box.zigzag) {
                            patternDef = `
                                <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="16" height="12">
                                    <rect width="16" height="12" fill="${fillColor}"/>
                                    <path d="M0,6 L4,2 L8,10 L12,2 L16,6" stroke="rgba(255,255,255,0.5)" stroke-width="2" fill="none"/>
                                </pattern>
                            `;
                            gradientDef = `
                                <radialGradient id="${gradientId}" cx="50%" cy="50%" r="70%">
                                    <stop offset="0%" style="stop-color:#a78bfa;stop-opacity:1" />
                                    <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:1" />
                                    <stop offset="100%" style="stop-color:#6d28d9;stop-opacity:1" />
                                </radialGradient>
                            `;
                            glowDef = `
                                <filter id="${glowId}">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            `;
                        } else if (box.offset) {
                            patternDef = `
                                <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="20" height="20">
                                    <rect width="20" height="20" fill="${fillColor}"/>
                                    <circle cx="10" cy="10" r="6" stroke="rgba(255,255,255,0.5)" stroke-width="2" fill="none"/>
                                    <circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.7)"/>
                                </pattern>
                            `;
                            gradientDef = `
                                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style="stop-color:#34d399;stop-opacity:1" />
                                    <stop offset="50%" style="stop-color:#10b981;stop-opacity:1" />
                                    <stop offset="100%" style="stop-color:#047857;stop-opacity:1" />
                                </linearGradient>
                            `;
                            glowDef = `
                                <filter id="${glowId}">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            `;
                        } else {
                            patternDef = `
                                <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="14" height="14">
                                    <rect width="14" height="14" fill="${fillColor}"/>
                                    <path d="M0,0 L0,14 M0,0 L14,0 M7,0 L7,14 M0,7 L14,7" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
                                </pattern>
                            `;
                            gradientDef = `
                                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" />
                                    <stop offset="50%" style="stop-color:#3b82f6;stop-opacity:1" />
                                    <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
                                </linearGradient>
                            `;
                            glowDef = `
                                <filter id="${glowId}">
                                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            `;
                        }
                        
                        html += `
                            <defs>
                                ${patternDef}
                                ${gradientDef}
                                ${glowDef}
                            </defs>
                            
                            <g class="box-group" style="cursor: pointer;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                                <!-- Enhanced shadow with blur -->
                                <rect x="${boxX + 4}" y="${boxY + 6}" 
                                      width="${boxWidth}" height="${boxHeight}" 
                                      fill="#000000" opacity="0.2" rx="6" 
                                      filter="url(#boxShadow)" />
                                
                                <!-- Main box with enhanced gradient and glow -->
                                <rect x="${boxX}" y="${boxY}" 
                                      width="${boxWidth}" height="${boxHeight}" 
                                      fill="url(#${gradientId})" stroke="${strokeColor}" stroke-width="3" 
                                      rx="6" opacity="${opacity}" filter="url(#${glowId})" />
                                
                                <!-- Pattern overlay with better opacity -->
                                <rect x="${boxX + 2}" y="${boxY + 2}" 
                                      width="${boxWidth - 4}" height="${boxHeight - 4}" 
                                      fill="url(#${patternId})" opacity="0.7" rx="4" />
                                
                                <!-- Enhanced inner border with gradient -->
                                <rect x="${boxX + 1.5}" y="${boxY + 1.5}" 
                                      width="${boxWidth - 3}" height="${boxHeight - 3}" 
                                      fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" rx="4.5" />
                                
                                <!-- Professional box labels (only if box is large enough) -->
                                ${boxWidth > 25 && boxHeight > 25 ? `
                                    <!-- Icon background -->
                                    <circle cx="${boxX + boxWidth/2}" cy="${boxY + boxHeight/2 - 6}" r="8" 
                                            fill="rgba(0,0,0,0.3)" opacity="${opacity * 0.8}"/>
                                    
                                    <!-- Box type icon -->
                                    <text x="${boxX + boxWidth/2}" y="${boxY + boxHeight/2 - 6}" 
                                          text-anchor="middle" dominant-baseline="middle"
                                          class="${isMobile ? 'text-sm' : 'text-base'} font-bold fill-white" 
                                          style="font-family: 'Inter', sans-serif; pointer-events: none; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);"
                                          opacity="${opacity}">
                                        ${box.rotated ? '↻' : box.zigzag ? '⟲' : box.offset ? '⬢' : '□'}
                                    </text>
                                    
                                    <!-- Box number with background -->
                                    <rect x="${boxX + boxWidth/2 - 12}" y="${boxY + boxHeight/2 + 2}" 
                                          width="24" height="12" rx="6" 
                                          fill="rgba(0,0,0,0.4)" opacity="${opacity * 0.9}"/>
                                    
                                    <text x="${boxX + boxWidth/2}" y="${boxY + boxHeight/2 + 8}" 
                                          text-anchor="middle" dominant-baseline="middle"
                                          class="${isMobile ? 'text-xs' : 'text-sm'} font-bold fill-white" 
                                          style="font-family: 'Inter', sans-serif; pointer-events: none; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);"
                                          opacity="${opacity}">
                                        ${showAllLayers ? `S${layerIndex + 1}` : `${layerIndex + 1}-${rowIndex + 1}-${colIndex + 1}`}
                                    </text>
                                ` : boxWidth > 15 && boxHeight > 15 ? `
                                    <!-- Minimal label for smaller boxes -->
                                    <text x="${boxX + boxWidth/2}" y="${boxY + boxHeight/2}" 
                                          text-anchor="middle" dominant-baseline="middle"
                                          class="text-xs font-bold fill-white" 
                                          style="font-family: 'Inter', sans-serif; pointer-events: none; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);"
                                          opacity="${opacity}">
                                        ${layerIndex + 1}
                                    </text>
                                ` : ''}
                            </g>
                        `;

                    });
                });
            }
            
            html += `
                        </g>
                        
                        <!-- Professional footer with statistics -->
                        <g transform="translate(0, ${svgHeight - 80})">
                            <!-- Footer background -->
                            <rect x="20" y="0" width="${svgWidth - 40}" height="70" 
                                  fill="rgba(30, 41, 59, 0.9)" rx="12" />
                            
                            <!-- Layer information -->
                            <text x="${svgWidth/2}" y="25" text-anchor="middle" 
                                  class="${isMobile ? 'text-sm' : 'text-lg'} font-bold fill-white" 
                                  style="font-family: 'Inter', sans-serif;">
                                ${showAllLayers ? `📊 Menampilkan Semua ${optimal.layers} Sap (Overlay View)` : `📋 Sap ${currentLayer + 1} dari ${optimal.layers}`}
                            </text>
                            
                            <!-- Statistics row -->
                            <g transform="translate(40, 40)">
                                <text x="0" y="0" class="${isMobile ? 'text-xs' : 'text-sm'} font-semibold fill-slate-300" 
                                      style="font-family: 'Inter', sans-serif;">
                                    📦 ${showAllLayers ? `${optimal.totalBoxes} MC (${optimal.boxesPerLayer} per sap)` : `${optimal.boxesPerLayer} MC di sap ini`}
                                </text>
                                
                                <text x="${(svgWidth - 80) / 3}" y="0" class="${isMobile ? 'text-xs' : 'text-sm'} font-semibold fill-slate-300" 
                                      style="font-family: 'Inter', sans-serif;">
                                    🎯 ${optimal.efficiency}% efisiensi
                                </text>
                                
                                <text x="${2 * (svgWidth - 80) / 3}" y="0" class="${isMobile ? 'text-xs' : 'text-sm'} font-semibold fill-slate-300" 
                                      style="font-family: 'Inter', sans-serif;">
                                    📏 ${showAllLayers ? `Kedalaman: 0-${optimal.layers * boxDimensions.length} cm` : `${(currentLayer * boxDimensions.length)}-${((currentLayer + 1) * boxDimensions.length)} cm`}
                                </text>
                            </g>
                        </g>
                        

                    </svg>
                    
                    <!-- Professional control panel -->
                    <div class="mt-6 flex flex-col lg:flex-row justify-between items-center gap-4 p-4 bg-slate-800 rounded-xl">
                        <div class="flex items-center gap-4">
                            <div class="text-white font-semibold">🎮 Kontrol Visualisasi:</div>
                            <button onclick="create2DVisualization()" 
                                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all">
                                🔄 Refresh
                            </button>
                        </div>
                        
                        ${showAllLayers ? `
                        <div class="flex items-center gap-4 text-slate-300 text-sm">
                            <div class="flex items-center gap-2">
                                <div class="w-4 h-4 bg-blue-500 rounded opacity-100"></div>
                                <span>Sap 1 (Depan)</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="w-4 h-4 bg-blue-500 rounded opacity-70"></div>
                                <span>Sap 2-3</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="w-4 h-4 bg-blue-500 rounded opacity-40"></div>
                                <span>Sap ${optimal.layers} (Belakang)</span>
                            </div>
                        </div>
                        ` : `
                        <div class="flex items-center gap-2 text-slate-300 text-sm">
                            <span>💡 Tips: Hover MC untuk detail, gunakan layer controls untuk navigasi</span>
                        </div>
                        `}
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
        }

        function setupLayerControls() {
            if (!calculationResults) return;
            
            const { optimal } = calculationResults;
            
            // Show layer controls
            document.getElementById('layerControls').classList.remove('hidden');
            document.getElementById('layerControls').classList.add('jiffy-elastic');
            
            // Setup layer slider
            const layerSlider = document.getElementById('layerSlider');
            const layerDisplay = document.getElementById('layerDisplay');
            layerSlider.max = optimal.layers;
            layerDisplay.textContent = `1 / ${optimal.layers}`;
            
            // Create layer tabs
            const layerTabs = document.getElementById('layerTabs');
            layerTabs.innerHTML = '';
            
            for (let i = 1; i <= optimal.layers; i++) {
                const tab = document.createElement('button');
                tab.className = `layer-tab px-4 py-2 text-sm font-semibold border-2 border-gray-200 ${i === 1 ? 'active' : ''} jiffy-hover-lift`;
                tab.textContent = `Sap ${i}`;
                tab.onclick = () => selectLayer(i);
                layerTabs.appendChild(tab);
            }
        }

        function selectLayer(layerNum) {
            // Update slider
            document.getElementById('layerSlider').value = layerNum;
            document.getElementById('layerDisplay').textContent = `${layerNum} / ${calculationResults.optimal.layers}`;
            
            // Update active tab
            document.querySelectorAll('.layer-tab').forEach((tab, index) => {
                if (index + 1 === layerNum) {
                    tab.classList.add('active');
                    tab.classList.add('jiffy-bounce');
                    setTimeout(() => tab.classList.remove('jiffy-bounce'), 600);
                } else {
                    tab.classList.remove('active');
                }
            });
            
            // Update visualization
            if (currentVisualizationMode === '3d') {
                createBoxes3D();
            } else {
                create2DVisualization();
            }
        }

        function showSpecificLayer(layerNum) {
            document.getElementById('layerDisplay').textContent = `${layerNum} / ${calculationResults.optimal.layers}`;
            selectLayer(parseInt(layerNum));
        }

        function toggleLayerMode() {
            const showAll = document.getElementById('showAllLayers').checked;
            
            if (showAll) {
                document.getElementById('layerSlider').disabled = true;
                document.querySelectorAll('.layer-tab').forEach(tab => {
                    tab.disabled = true;
                    tab.classList.add('opacity-50');
                });
                
                // Auto-open doors when showing all layers in 3D mode
                if (currentVisualizationMode === '3d' && containerMesh && containerMesh.userData.leftDoor) {
                    const isOpen = containerMesh.userData.leftDoor.userData.isOpen;
                    if (!isOpen) {
                        // Automatically open doors
                        setTimeout(() => {
                            toggleContainerDoors();
                        }, 500);
                    }
                }
            } else {
                document.getElementById('layerSlider').disabled = false;
                document.querySelectorAll('.layer-tab').forEach(tab => {
                    tab.disabled = false;
                    tab.classList.remove('opacity-50');
                });
            }
            
            // Update visualization
            if (currentVisualizationMode === '3d') {
                createBoxes3D();
            } else {
                create2DVisualization();
            }
        }

        function resetCamera() {
            if (camera && controls) {
                camera.position.set(50, 50, 50);
                controls.reset();
                
                // Add animation feedback
                const button = event.target;
                button.classList.add('jiffy-bounce');
                setTimeout(() => button.classList.remove('jiffy-bounce'), 600);
                
                showJiffyAlert('Kamera direset ke posisi default', 'info');
            }
        }

        function toggleWireframe() {
            const wireframe = document.getElementById('wireframeMode').checked;
            
            boxMeshes.forEach(mesh => {
                mesh.material.wireframe = wireframe;
            });
            
            showJiffyAlert(wireframe ? 'Mode wireframe aktif' : 'Mode solid aktif', 'info');
        }

        function updateOpacity(value) {
            document.getElementById('opacityValue').textContent = value;
            
            boxMeshes.forEach(mesh => {
                mesh.material.opacity = parseFloat(value);
            });
        }

        function toggleContainerDoors() {
            if (!containerMesh || !containerMesh.userData.leftDoor) return;
            
            const leftDoor = containerMesh.userData.leftDoor;
            const rightDoor = containerMesh.userData.rightDoor;
            const leftHandle = containerMesh.userData.leftHandle;
            const rightHandle = containerMesh.userData.rightHandle;
            const hinges = containerMesh.userData.hinges;
            const lock = containerMesh.userData.lock;
            const button = document.getElementById('doorToggleBtn');
            
            const isOpen = leftDoor.userData.isOpen;
            const targetAngle = isOpen ? 0 : Math.PI * 0.8; // 144 degrees for wider opening
            
            // Animate doors (for reefer container - doors at back opening sideways)
            const animateDoors = () => {
                const duration = 2000; // 2 seconds for smoother animation
                const startTime = Date.now();
                const startAngleLeft = leftDoor.rotation.y; // Use Y rotation for sideways opening
                const startAngleRight = rightDoor.rotation.y;
                const startPosLeft = leftDoor.position.z;
                const startPosRight = rightDoor.position.z;
                
                // Calculate door movement for proper hinge behavior
                const containerWidth = calculationResults.containerDimensions.width / 10;
                const doorWidth = containerWidth * 0.45;
                
                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Smooth easing function with bounce
                    const easeInOut = progress < 0.5 
                        ? 4 * progress * progress * progress
                        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                    
                    if (isOpen) {
                        // Closing doors (back to center)
                        leftDoor.rotation.y = startAngleLeft * (1 - easeInOut);
                        rightDoor.rotation.y = startAngleRight * (1 - easeInOut);
                        
                        // Move doors back to original position
                        leftDoor.position.z = startPosLeft + (doorWidth/2 * easeInOut);
                        rightDoor.position.z = startPosRight - (doorWidth/2 * easeInOut);
                        
                        // Animate handles
                        if (leftHandle) {
                            leftHandle.rotation.y = startAngleLeft * (1 - easeInOut);
                            leftHandle.position.z = leftDoor.position.z - 3;
                        }
                        if (rightHandle) {
                            rightHandle.rotation.y = startAngleRight * (1 - easeInOut);
                            rightHandle.position.z = rightDoor.position.z + 3;
                        }
                        
                        // Animate lock back to center
                        if (lock) {
                            lock.position.z = containerWidth/2;
                            lock.scale.x = 1 + (0.3 * (1 - easeInOut));
                        }
                    } else {
                        // Opening doors (left door opens left, right door opens right)
                        leftDoor.rotation.y = -targetAngle * easeInOut;
                        rightDoor.rotation.y = targetAngle * easeInOut;
                        
                        // Move doors outward from hinges (realistic hinge behavior)
                        const leftOffset = Math.sin(targetAngle * easeInOut) * doorWidth * 0.8;
                        const rightOffset = Math.sin(targetAngle * easeInOut) * doorWidth * 0.8;
                        
                        leftDoor.position.z = startPosLeft - leftOffset;
                        rightDoor.position.z = startPosRight + rightOffset;
                        
                        // Animate handles to follow doors
                        if (leftHandle) {
                            leftHandle.rotation.y = -targetAngle * easeInOut;
                            leftHandle.position.z = leftDoor.position.z - 3;
                        }
                        if (rightHandle) {
                            rightHandle.rotation.y = targetAngle * easeInOut;
                            rightHandle.position.z = rightDoor.position.z + 3;
                        }
                        
                        // Animate lock opening (split apart)
                        if (lock) {
                            lock.position.z = containerWidth/2;
                            lock.scale.x = 1 + (0.5 * easeInOut); // Stretch horizontally
                            lock.material.opacity = 1 - (0.7 * easeInOut); // Fade out
                        }
                    }
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        // Animation complete
                        leftDoor.userData.isOpen = !isOpen;
                        rightDoor.userData.isOpen = !isOpen;
                        button.textContent = isOpen ? '🚪 Buka Pintu' : '🚪 Tutup Pintu';
                        button.disabled = false;
                        button.classList.remove('jiffy-pulse');
                        
                        // Update box visibility when doors open/close
                        updateBoxVisibilityForDoors(!isOpen);
                        
                        showJiffyAlert(isOpen ? 'Pintu reefer container ditutup' : 'Pintu reefer container dibuka', 'success');
                    }
                };
                
                animate();
            };
            
            // Start animation
            button.disabled = true;
            button.classList.add('jiffy-pulse');
            button.textContent = isOpen ? '⏳ Menutup...' : '⏳ Membuka...';
            
            animateDoors();
        }

        function updateBoxVisibilityForDoors(doorsOpen) {
            if (!boxMeshes.length) return;
            
            const showAllLayers = document.getElementById('showAllLayers').checked;
            
            // MC SELALU SOLID - tidak berubah opacity saat pintu buka/tutup
            boxMeshes.forEach(mesh => {
                // MC selalu solid dengan opacity penuh
                mesh.material.opacity = 1.0;
                mesh.material.transparent = false;
                
                if (doorsOpen && showAllLayers) {
                    // Hanya tambahkan glow effect untuk highlight saat pintu terbuka
                    const boxLayerIndex = Math.floor(mesh.position.x / (calculationResults.boxDimensions.length / 10));
                    const totalLayers = calculationResults.optimal.layers;
                    
                    if (boxLayerIndex >= totalLayers - 2) {
                        // Last 2 layers - add blue glow
                        if (mesh.material.emissive) {
                            mesh.material.emissive.setHex(0x003366);
                            mesh.material.emissiveIntensity = 0.3;
                        }
                    } else if (boxLayerIndex >= totalLayers - 4) {
                        // Middle layers - light glow
                        if (mesh.material.emissive) {
                            mesh.material.emissive.setHex(0x001122);
                            mesh.material.emissiveIntensity = 0.1;
                        }
                    }
                } else if (doorsOpen) {
                    // Single layer - slight highlight
                    if (mesh.material.emissive) {
                        mesh.material.emissive.setHex(0x002244);
                        mesh.material.emissiveIntensity = 0.2;
                    }
                } else {
                    // Remove glow when doors closed
                    if (mesh.material.emissive) {
                        mesh.material.emissive.setHex(0x000000);
                        mesh.material.emissiveIntensity = 0;
                    }
                }
            });
            
            // Handle container walls - ONLY back area transparency changes
            if (containerMesh) {
                containerMesh.children.forEach(child => {
                    if (child.material && child.material.opacity !== undefined) {
                        const containerLength = calculationResults.containerDimensions.length / 10;
                        
                        if (doorsOpen) {
                            // Only affect elements at the BACK of the container (where doors are)
                            if (child.position.x >= containerLength - 2) {
                                if (child.userData && (child.userData.isLeftDoor || child.userData.isRightDoor)) {
                                    // Doors themselves - keep visible but slightly transparent
                                    child.material.opacity = 0.7;
                                    child.material.transparent = true;
                                } else {
                                    // Back wall elements - make completely transparent (100%)
                                    child.material.opacity = 0.0;
                                    child.material.transparent = true;
                                    child.visible = false; // Hide completely for 100% transparency
                                }
                            }
                            // All other walls remain SOLID - no changes
                        } else {
                            // Doors closed - restore ALL walls to original opacity
                            if (child.material.map) {
                                child.material.opacity = 0.9;
                                child.material.transparent = true;
                                child.visible = true; // Make sure all walls are visible again
                            }
                        }
                    }
                });
            }
        }

        

        // Window resize handler
        window.addEventListener('resize', function() {
            if (renderer && camera) {
                const threejsContainer = document.getElementById('threejs-container');
                camera.aspect = threejsContainer.clientWidth / 600;
                camera.updateProjectionMatrix();
                renderer.setSize(threejsContainer.clientWidth, 600);
            }
        });
    
