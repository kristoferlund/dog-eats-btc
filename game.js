const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let score = 0;

const GRAVITY = 0.3;
const JUMP_STRENGTH = 12;
const MAX_FALL_DISTANCE = canvas.height / 2;
const INVINCIBILITY_DURATION = 5000;
const GROUND_FRICTION = 0.9;
const AIR_FRICTION = 0.85;

const KEY_LEFT = "ArrowLeft";
const KEY_RIGHT = "ArrowRight";
const KEY_JUMP = " ";

const LEVEL_WIDTH = canvas.width * 4;
let coinsCollected = 0;
let levelCompleted = false;

const numCoinGroups = 5;
const coinsPerGroup = 4;
const coinSize = 25;

const ethereumLogo = new Image();
ethereumLogo.src = "./dog.png";

const bitcoinLogo = new Image();
bitcoinLogo.src = "./bitcoin.webp";

const backgroundImg = new Image();
backgroundImg.src = "./background.png";

const introBackgroundImage = new Image();
introBackgroundImage.src = "./intro.png";

const keysPressed = new Set();

let gameStarted = false;

document.addEventListener("keydown", (e) => {
  keysPressed.add(e.key);
  if (e.key === KEY_JUMP) {
    e.preventDefault();
    character.jump();
  }
});

document.addEventListener("keyup", (e) => {
  keysPressed.delete(e.key);
});

class Platform {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw() {
    ctx.fillStyle = "green";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class Coin {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.initialY = y;
    this.floatAmplitude = 10;
    this.floatSpeed = 0.01;
  }

  collect() {
    this.collected = true;
    coinsCollected++;
  }

  draw() {
    const yOffset =
      this.floatAmplitude * Math.sin(Date.now() * this.floatSpeed);
    ctx.drawImage(bitcoinLogo, this.x, this.y + yOffset, this.size, this.size);
  }

  isTouching(character) {
    const yOffset =
      this.floatAmplitude * Math.sin(Date.now() * this.floatSpeed);
    return (
      character.x + character.size > this.x &&
      character.x < this.x + this.size &&
      character.y + character.size > this.y + yOffset &&
      character.y < this.y + yOffset + this.size
    );
  }
}

class Character {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.velocityY = 0;
    this.isOnGround = false;
    this.invincibleUntil = 0;
    this.velocityX = 0;
  }

  draw() {
    if (this.isInvincible()) {
      ctx.fillStyle = "red";
      ctx.globalAlpha = Math.sin(Date.now() / 100) * 0.5 + 0.5;
      ctx.fillRect(this.x, this.y, this.size, this.size);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(ethereumLogo, this.x, this.y, this.size, this.size);
  }

  update(platforms, traps) {
    this.velocityY += GRAVITY;
    this.y += this.velocityY;

    this.isOnGround = false;

    for (const platform of platforms) {
      if (
        this.y + this.size > platform.y &&
        this.y + this.size < platform.y + platform.height &&
        this.x + this.size > platform.x &&
        this.x < platform.x + platform.width &&
        this.velocityY > 0
      ) {
        this.isOnGround = true;
        this.velocityY = 0;
        this.y = platform.y - this.size;
        break;
      }
    }

    // Apply horizontal velocity and friction
    this.x = Math.min(Math.max(0, this.x), LEVEL_WIDTH - this.size);
    this.x += this.velocityX;

    if (this.isOnGround) {
      this.velocityX *= GROUND_FRICTION;
    } else {
      this.velocityX *= AIR_FRICTION;
    }

    if (!this.isInvincible()) {
      for (const trap of traps) {
        if (trap.isTouching(this)) {
          this.invincibleUntil = Date.now() + INVINCIBILITY_DURATION;
          break;
        }
      }
    }

    if (this.y > canvas.height + MAX_FALL_DISTANCE) {
      this.reset();
    }

    coins.forEach((coin, index) => {
      if (coin.isTouching(this)) {
        score++;
        coins.splice(index, 1);
        coin.collect();
      }
    });

    if (coinsCollected === coinsPerGroup * numCoinGroups) {
      levelCompleted = true;
    }
  }

  reset() {
    this.y = 0;
    this.velocityY = 0;
  }

  jump() {
    if (this.isOnGround) {
      this.velocityY = -JUMP_STRENGTH;
    }
  }

  isInvincible() {
    return Date.now() < this.invincibleUntil;
  }
}

class Camera {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  drawParallaxBackground() {
    const parallaxFactor = 0.5; // Adjust this value to control the parallax effect speed (0 - 1)

    // Calculate the background position based on the camera position and parallax factor
    const backgroundX = -this.x * parallaxFactor;
    const backgroundY = -this.y * parallaxFactor;

    // Calculate the scaled width and height of the background image
    const scaledWidth = (this.width * LEVEL_WIDTH) / canvas.width;
    const scaledHeight = this.height;

    // Draw the background image
    ctx.drawImage(
      backgroundImg,
      backgroundX,
      backgroundY,
      scaledWidth,
      scaledHeight
    );

    // Draw a second instance of the background image if necessary to fill the canvas horizontally
    if (backgroundX + scaledWidth < canvas.width) {
      ctx.drawImage(
        backgroundImg,
        backgroundX + scaledWidth,
        backgroundY,
        scaledWidth,
        scaledHeight
      );
    }
  }

  update(character) {
    const offsetX = this.width * 0.2;

    if (
      character.x > this.x + this.width - offsetX &&
      this.x + this.width < LEVEL_WIDTH
    ) {
      this.x = Math.min(
        character.x - this.width + offsetX,
        LEVEL_WIDTH - this.width
      );
    } else if (character.x < this.x + offsetX && this.x > 0) {
      this.x = Math.max(character.x - offsetX, 0);
    }
  }

  draw(obj) {
    ctx.save();
    ctx.translate(-this.x, -this.y);
    obj.draw();
    ctx.restore();
  }
}

const platforms = generatePlatforms();
const coins = generateCoins();
const character = new Character(canvas.width / 2, 0, 40);
const camera = new Camera(0, 0, canvas.width, canvas.height);

function drawScore() {
  if (levelCompleted) return;
  ctx.font = "bold 32px Arial";
  ctx.fillStyle = "black";
  ctx.textAlign = "right";
  ctx.fillText(`Score: ${score}`, canvas.width - 20, 40);
}

function generatePlatforms() {
  const numPlatforms = 40;
  const platformWidth = 150;
  const platformHeight = 20;
  const platforms = [];

  for (let i = 0; i < numPlatforms; i++) {
    const x = Math.random() * (LEVEL_WIDTH - platformWidth);
    const y = (canvas.height / numPlatforms) * i;
    platforms.push(new Platform(x, y, platformWidth, platformHeight));
  }

  return platforms;
}

function generateCoins() {
  const coins = [];

  for (let i = 0; i < numCoinGroups; i++) {
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    let baseX =
      platform.x + Math.random() * (platform.width - coinSize * coinsPerGroup);
    for (let j = 0; j < coinsPerGroup; j++) {
      const x = baseX + Math.random() * 60 + coinSize + 10;
      baseX = x;
      const y = platform.y - coinSize - Math.random() * 30;
      coins.push(new Coin(x, y, coinSize));
    }
  }

  return coins;
}

function update() {
  handleInput();
  character.update(platforms, coins);
}

function handleInput() {
  const acceleration = 0.5;
  if (keysPressed.has(KEY_LEFT)) {
    character.velocityX -= acceleration;
  }
  if (keysPressed.has(KEY_RIGHT)) {
    character.velocityX += acceleration;
  }
}

function drawGround() {
  const groundHeight = 20;
  ctx.fillStyle = "green";
  ctx.fillRect(0, canvas.height - groundHeight, LEVEL_WIDTH, groundHeight);

  // Update to make the character stand on the ground
  if (character.y + character.size * 1.25 > canvas.height - groundHeight) {
    character.isOnGround = true;
    character.velocityY = 0;
    character.y = canvas.height - groundHeight - character.size * 1.25;
  }
}

function drawLevelCompleteMessage() {
  if (!levelCompleted) return;
  const text = "LEVEL COMPLETE";
  const text2 = "DOG ETH BTC";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
  ctx.fillStyle = color;
  const yOffset = 10 * Math.sin(Date.now() / 400);
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + yOffset);
  ctx.fillText(text2, canvas.width / 2, canvas.height / 2 + yOffset + 60);
  if (levelCompleted) {
    requestAnimationFrame(drawLevelCompleteMessage);
  }
}

const startButtonX = canvas.width / 2 - 75;
const startButtonY = canvas.height * 0.7;
const startButtonWidth = 150;
const startButtonHeight = 50;

function drawIntroScreen() {
  if (gameStarted) return;

  ctx.drawImage(introBackgroundImage, 0, 0, canvas.width, canvas.height);

  // Draw title text
  const titleText = "DOG ETH BTC";
  ctx.font = "bold 48px 'Press Start 2P', Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `hsl(${(Date.now() / 40) % 360}, 100%, 50%)`; // Cycle through hue values for a rainbow effect
  const yOffset = 10 * Math.sin(Date.now() / 400);
  ctx.fillText(titleText, canvas.width / 2, 50 + yOffset);

  // Draw creator text
  const creatorText = "Created by: Kristofer Lund";
  ctx.font = "16px 'Press Start 2P', Arial";
  ctx.fillText(creatorText, canvas.width / 2, canvas.height - 30);

  // Draw start button
  const startButtonText = "START";
  ctx.fillStyle = "white";
  ctx.fillRect(startButtonX, startButtonY, startButtonWidth, startButtonHeight);
  ctx.fillStyle = "black";
  ctx.font = "bold 24px 'Press Start 2P', Arial";
  ctx.fillText(
    startButtonText,
    canvas.width / 2,
    startButtonY + startButtonHeight / 2
  );

  canvas.addEventListener("click", handleIntroScreenClick, { once: true });
}

function handleIntroScreenClick(event) {
  const canvasRect = canvas.getBoundingClientRect();
  const x = event.clientX - canvasRect.left;
  const y = event.clientY - canvasRect.top;

  if (
    x >= startButtonX &&
    x <= startButtonX + startButtonWidth &&
    y >= startButtonY &&
    y <= startButtonY + startButtonHeight
  ) {
    gameStarted = true;
  } else {
    // Reattach the click event listener if the click was outside the button
    canvas.addEventListener("click", handleIntroScreenClick, { once: true });
  }
}

function draw() {
  if (!gameStarted) {
    drawIntroScreen();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  camera.drawParallaxBackground(); // Add this line to draw the parallax background
  camera.draw({ draw: () => drawGround() });
  platforms.forEach((platform) => camera.draw(platform));
  coins.forEach((coin) => camera.draw(coin));
  camera.draw(character);

  drawScore();
  drawLevelCompleteMessage();
}

function gameLoop() {
  update();
  camera.update(character);
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();

Adding Gameplay Elements
The Machine generated code for various gameplay elements, such as character movement, collision detection, a