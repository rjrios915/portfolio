// snake.js

const canvas = document.getElementById('snakeCanvas');
const ctx = canvas.getContext('2d');
const ghost = document.getElementById('ghostFruit');

const cellSize = 40;
const stepInterval = 100;

let cols, rows;
let snake = [];
let prevSnake = [];
let dir = { x: 1, y: 0 };
let fruits = [];
let growNext = false;

let target = null;
let axisOrder = ['x', 'y'];

let lastEatTime = Date.now();
let lastMoveTime = null;
let lastWanderTime = Date.now();
const wanderInterval = 3000;

// ——— Initialization ———
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    resetSnake();

    // track cursor to move ghost, anywhere
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onClick);

    requestAnimationFrame(animate);
}

// ——— Helpers ———
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / cellSize);
    rows = Math.floor(canvas.height / cellSize);
}

function randomDir() {
    const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    return dirs[Math.floor(Math.random() * 4)];
}

function pickTarget() {
    if (!fruits.length) { target = null; return; }
    const head = snake[0];
    let nearest = fruits[0],
        best = Math.abs(head.x - nearest.x) + Math.abs(head.y - nearest.y);
    for (let f of fruits) {
        const d = Math.abs(head.x - f.x) + Math.abs(head.y - f.y);
        if (d < best) { best = d; nearest = f; }
    }
    target = { x: nearest.x, y: nearest.y };
    const dx = Math.abs(head.x - target.x),
        dy = Math.abs(head.y - target.y);
    axisOrder = dx < dy ? ['y', 'x'] : ['x', 'y'];
}

function onMouseMove(e) {

    if (ghost.style.display !== 'block') {
        ghost.style.display = 'block';
    }
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / cellSize) * cellSize;
    const y = Math.floor((e.clientY - r.top) / cellSize) * cellSize;
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
}

function onClick(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / cellSize);
    const y = Math.floor((e.clientY - r.top) / cellSize);
    fruits.push({ x, y });
    if (!target) pickTarget();
}

function resetSnake() {
    snake = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];
    prevSnake = [{ ...snake[0] }];
    dir = { x: 1, y: 0 };
    fruits = [];
    growNext = false;
    target = null;
    lastEatTime = Date.now();
    lastMoveTime = null;
    lastWanderTime = Date.now();
}

// ——— Game logic ———
function updateLogic(now) {
    if (!target && fruits.length) pickTarget();

    if (now - lastEatTime > 5000 && snake.length > 1) {
        snake.pop();
        lastEatTime = now;
    }
    if (!target && now - lastWanderTime > wanderInterval) {
        dir = randomDir();
        lastWanderTime = now;
    }
    if (target) {
        const head = snake[0];
        const [p, s] = axisOrder;
        if (head[p] !== target[p]) {
            const nd = p === 'x'
                ? { x: target.x > head.x ? 1 : -1, y: 0 }
                : { x: 0, y: target.y > head.y ? 1 : -1 };
            if (nd.x !== dir.x || nd.y !== dir.y) dir = nd;
        } else if (head[s] !== target[s]) {
            const nd = s === 'x'
                ? { x: target.x > head.x ? 1 : -1, y: 0 }
                : { x: 0, y: target.y > head.y ? 1 : -1 };
            if (nd.x !== dir.x || nd.y !== dir.y) dir = nd;
        }
    }

    const old = snake[0];
    const nh = {
        x: (old.x + dir.x + cols) % cols,
        y: (old.y + dir.y + rows) % rows
    };
    snake.unshift(nh);

    for (let i = 0; i < fruits.length; i++) {
        if (nh.x === fruits[i].x && nh.y === fruits[i].y) {
            fruits.splice(i, 1);
            growNext = true;
            lastEatTime = now;
            if (target && nh.x === target.x && nh.y === target.y) target = null;
            break;
        }
    }
    if (!growNext) snake.pop();
    growNext = false;
}

// ——— Draw & wrap ———
function draw(progress) {
    const W = canvas.width, H = canvas.height;
    const tileW = cols * cellSize, tileH = rows * cellSize;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    // real fruits
    ctx.fillStyle = 'red';
    fruits.forEach(f =>
        ctx.fillRect(f.x * cellSize, f.y * cellSize, cellSize, cellSize)
    );

    // snake
    ctx.fillStyle = 'skyblue';
    for (let i = 0; i < snake.length; i++) {
        const prev = prevSnake[i] || snake[i], curr = snake[i];
        let dx = curr.x - prev.x, dy = curr.y - prev.y;
        if (dx > 1) dx -= cols; else if (dx < -1) dx += cols;
        if (dy > 1) dy -= rows; else if (dy < -1) dy += rows;

        const xRaw = (prev.x + dx * progress) * cellSize,
            yRaw = (prev.y + dy * progress) * cellSize;

        for (let ix = -1; ix <= 1; ix++) {
            for (let iy = -1; iy <= 1; iy++) {
                const x = xRaw + ix * tileW, y = yRaw + iy * tileH;
                if (x + cellSize > 0 && x < W && y + cellSize > 0 && y < H) {
                    ctx.fillRect(x, y, cellSize, cellSize);
                }
            }
        }
    }
}

// ——— Animation ———
function animate(ts) {
    if (lastMoveTime === null) lastMoveTime = ts;
    const now = Date.now(), delta = ts - lastMoveTime;
    if (delta >= stepInterval) {
        prevSnake = snake.map(p => ({ x: p.x, y: p.y }));
        updateLogic(now);
        lastMoveTime += stepInterval;
    }
    const prog = Math.min((ts - lastMoveTime) / stepInterval, 1);
    draw(prog);
    requestAnimationFrame(animate);
}

init();
