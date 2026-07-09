import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { t, initI18n, switchLang } from './i18n.js'

const wrap = document.getElementById('canvasWrap')
const placeholder = document.getElementById('placeholder')
const fileInput = document.getElementById('fileInput')
const btnReset = document.getElementById('btnReset')
const btnClear = document.getElementById('btnClear')
const fileName = document.getElementById('fileName')
const faceCount = document.getElementById('faceCount')
const vertexCount = document.getElementById('vertexCount')
const modelSize = document.getElementById('modelSize')
const modelVolume = document.getElementById('modelVolume')

initI18n()

// ---------- Three.js 场景 ----------
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(45, wrap.clientWidth / wrap.clientHeight, 0.1, 1000)
camera.position.set(5, 4, 8)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(wrap.clientWidth, wrap.clientHeight)
renderer.setClearColor(0x111827)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
wrap.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.12
controls.minDistance = 0.5
controls.maxDistance = 500
controls.target.set(0, 0, 0)

// 灯光
const ambientLight = new THREE.AmbientLight(0x404060, 2.5) //0.6
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 2.5)
dirLight.position.set(5, 10, 7)
dirLight.castShadow = true
dirLight.shadow.mapSize.width = 1024
dirLight.shadow.mapSize.height = 1024
scene.add(dirLight)

const dirLight2 = new THREE.DirectionalLight(0x8888ff, 0.8)
dirLight2.position.set(-5, 3, -5)
scene.add(dirLight2)

const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
fillLight.position.set(0, -5, 0)
scene.add(fillLight)

const pointLight = new THREE.PointLight(0xffffff, 3, 20)
pointLight.position.set(3, 5, 4)
scene.add(pointLight)

let isPointLightMode = true

function setLightMode(pointMode) {
  isPointLightMode = pointMode
  if (pointMode) {
    ambientLight.intensity = 0.3
    dirLight.intensity = 2.5
    dirLight2.intensity = 0.8
    fillLight.intensity = 0.4
    pointLight.intensity = 3
  } else {
    ambientLight.intensity = 0.6
    dirLight.intensity = 1.2
    dirLight2.intensity = 0.8
    fillLight.intensity = 0.5
    pointLight.intensity = 0
  }
}

// 辅助元素
const gridHelper = new THREE.GridHelper(10, 20, 0x4a5568, 0x2d3748)
scene.add(gridHelper)

// 地面（阴影接收）
const groundGeo = new THREE.PlaneGeometry(20, 20)
const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -0.01
ground.receiveShadow = true
scene.add(ground)

// ---------- 模型管理 ----------
let currentMesh = null
let currentColor = '#ffffff'

function clearModel() {
  if (currentMesh) {
    scene.remove(currentMesh)
    currentMesh.geometry?.dispose()
    currentMesh.material?.dispose()
    currentMesh = null
  }
  currentStlData = null
  currentStlName = 'model.stl'
  placeholder.style.display = 'flex'
  fileName.textContent = '-'
  faceCount.textContent = '0'
  vertexCount.textContent = '0'
  modelSize.textContent = '-'
  modelVolume.textContent = '-'
}

function computeVolume(geometry) {
  const pos = geometry.attributes.position
  if (!pos) return 0
  const indexAttr = geometry.index
  let vol = 0
  if (indexAttr) {
    for (let i = 0; i < indexAttr.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, indexAttr.getX(i))
      const b = new THREE.Vector3().fromBufferAttribute(pos, indexAttr.getX(i + 1))
      const c = new THREE.Vector3().fromBufferAttribute(pos, indexAttr.getX(i + 2))
      vol += a.dot(b.cross(c)) / 6
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, i)
      const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1)
      const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2)
      vol += a.dot(b.cross(c)) / 6
    }
  }
  return Math.abs(vol)
}

function loadSTL(buffer, name) {
  const loader = new STLLoader()
  const geometry = loader.parse(buffer)

  geometry.computeVertexNormals()
  geometry.center()

  // 计算包围盒和原始体积
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  const size = bb.max.clone().sub(bb.min)
  const maxDim = Math.max(size.x, size.y, size.z)
  const originalVolume = computeVolume(geometry)

  // 缩放以适应场景
  const targetScale = 5
  const scale = targetScale / maxDim
  geometry.scale(scale, scale, scale)

  // 材质
  const material = new THREE.MeshStandardMaterial({
    color: currentColor,
    roughness: 0.4,
    metalness: 0.15,
    flatShading: false,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.y = 0

  // 边缘线
  const edges = new THREE.EdgesGeometry(geometry)
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.08,
  })
  const wireframe = new THREE.LineSegments(edges, lineMat)
  wireframe.position.copy(mesh.position)

  // 切换模型
  clearModel()

  currentMesh = new THREE.Group()
  currentMesh.add(mesh)
  currentMesh.add(wireframe)
  currentMesh.userData.mesh = mesh
  currentMesh.userData.wireframe = wireframe
  scene.add(currentMesh)

  placeholder.style.display = 'none'

  // 信息展示
  fileName.textContent = name || t('unknown')
  const posAttr = geometry.attributes.position
  faceCount.textContent = Math.floor(posAttr.count / 3)
  vertexCount.textContent = posAttr.count
  modelSize.textContent = `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`

  modelVolume.textContent = `${originalVolume.toFixed(2)}`

  controls.target.set(0, 0, 0)
  controls.update()
}

function setModelColor(color) {
  currentColor = color
  if (currentMesh) {
    const mesh = currentMesh.userData.mesh
    if (mesh) mesh.material.color.set(color)
  }
}

// ---------- 颜色选择 ----------
document.querySelectorAll('.color-swatch').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'))
    el.classList.add('active')
    setModelColor(el.dataset.color)
  })
})

// ---------- 当前 STL 数据（用于下载）----------
let currentStlData = null
let currentStlName = 'model.stl'

// ---------- Litematic 上传 ----------
const litematicInput = document.getElementById('litematicInput')
const btnDownload = document.getElementById('btnDownload')

litematicInput.addEventListener('change', async e => {
  const file = e.target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  try {
    const resp = await fetch('/convert', { method: 'POST', body: formData })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(text)
    }
    const blob = await resp.blob()
    const buffer = await blob.arrayBuffer()
    loadSTL(buffer, file.name.replace(/\.litematic$/i, '.stl'))
    currentStlData = blob
    currentStlName = file.name.replace(/\.litematic$/i, '.stl')
  } catch (err) {
    alert(t('errLitematic') + err.message)
  }
  litematicInput.value = ''
})

// ---------- 下载 STL ----------
btnDownload.addEventListener('click', () => {
  if (!currentStlData) {
    alert(t('errNoModel'))
    return
  }
  const url = URL.createObjectURL(currentStlData)
  const a = document.createElement('a')
  a.href = url
  a.download = currentStlName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
})

// ---------- 文件处理 ----------
fileInput.addEventListener('change', e => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
    try {
      loadSTL(ev.target.result, file.name)
      currentStlData = new Blob([ev.target.result])
      currentStlName = file.name
    } catch (err) {
      alert(t('errStlParse') + err.message)
    }
  }
  reader.readAsArrayBuffer(file)
  fileInput.value = ''
})

// 拖拽支持
wrap.addEventListener('dragover', e => { e.preventDefault(); wrap.style.outline = '2px dashed #e94560' })
wrap.addEventListener('dragleave', () => { wrap.style.outline = '' })
wrap.addEventListener('drop', e => {
  e.preventDefault()
  wrap.style.outline = ''
  const file = e.dataTransfer.files[0]
  if (!file || !file.name.toLowerCase().endsWith('.stl')) {
    alert(t('errDropStl'))
    return
  }
  const reader = new FileReader()
  reader.onload = ev => {
    try {
      loadSTL(ev.target.result, file.name)
    } catch (err) {
      alert(t('errStlParse') + err.message)
    }
  }
  reader.readAsArrayBuffer(file)
})

btnReset.addEventListener('click', () => {
  camera.position.set(5, 4, 8)
  controls.target.set(0, 0, 0)
  controls.update()
})

btnClear.addEventListener('click', clearModel)

// ---------- 主题切换 ----------
const btnTheme = document.getElementById('btnTheme')
btnTheme.addEventListener('click', () => {
  const isDark = document.body.getAttribute('data-theme') !== 'light'
  document.body.setAttribute('data-theme', isDark ? 'light' : '')
  btnTheme.textContent = isDark ? t('themeLight') : t('themeDark')
  renderer.setClearColor(isDark ? 0xe8ecf1 : 0x111827)
  // 更新网格颜色
  const c1 = isDark ? 0xcccccc : 0x4a5568
  const c2 = isDark ? 0xaaaaaa : 0x2d3748
  gridHelper.material.color.setHex(c1)
  if (gridHelper.material.color2) gridHelper.material.color2.setHex(c2)
})

// ---------- 光照模式切换 ----------
const btnLightMode = document.getElementById('btnLightMode')
btnLightMode.addEventListener('click', () => {
  const pointMode = !isPointLightMode
  setLightMode(pointMode)
  btnLightMode.textContent = pointMode ? t('lightPoint') : t('lightAmbient')
  btnLightMode.classList.toggle('active', pointMode)
})

// ---------- 语言切换 ----------
const btnLang = document.getElementById('btnLang')
btnLang.addEventListener('click', () => {
  switchLang()
  btnLang.textContent = t('langSwitch')
  // 重新应用主题/灯光按钮上动态更新的文本
  const isDark = document.body.getAttribute('data-theme') === 'light'
  btnTheme.textContent = isDark ? t('themeLight') : t('themeDark')
  btnLightMode.textContent = isPointLightMode ? t('lightPoint') : t('lightAmbient')
})

// ---------- 窗口自适应 ----------
function resize() {
  const w = wrap.clientWidth
  const h = wrap.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

window.addEventListener('resize', resize)

// 初始时适应
setTimeout(resize, 50)

// ---------- 渲染循环 ----------
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()
