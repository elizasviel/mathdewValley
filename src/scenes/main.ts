import "phaser";
import UIScene from "./UIScene"; // Import UIScene

type CarriedTileInfo = {
  x: number;
  y: number;
  index: number;
  layer: Phaser.Tilemaps.TilemapLayer;
  tileset: Phaser.Tilemaps.Tileset;

  relativeOffsetX?: number;
  relativeOffsetY?: number;
};

export default class MainScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;
  private player!: Phaser.GameObjects.Sprite;
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SHIFT: Phaser.Input.Keyboard.Key;
  };
  private currentDir: string = "down";
  private isCarrying: boolean = false;
  private isPerformingAction: boolean = false;

  private carriedItemPart1Sprite: Phaser.GameObjects.Sprite | null = null;
  private carriedItemPart2Sprite: Phaser.GameObjects.Sprite | null = null;
  private carriedItemOriginalTile1: CarriedTileInfo | null = null;
  private carriedItemOriginalTile2: CarriedTileInfo | null = null;

  private readonly walkSpeed = 100;
  private readonly runSpeed = 200;
  private readonly baseFrameRate = 10;
  private readonly actionFrameRate = this.baseFrameRate * 1.2;

  private grassLayer!: Phaser.Tilemaps.TilemapLayer;
  private soilLayer!: Phaser.Tilemaps.TilemapLayer;
  private cropLayer!: Phaser.Tilemaps.TilemapLayer; // Layer for planted crops
  private stemLayer!: Phaser.Tilemaps.TilemapLayer; // Layer for crop top parts (stems)
  private uiScene!: UIScene; // Reference to the UI Scene

  private activeGlows: {
    graphics: Phaser.GameObjects.Graphics;
    x: number;
    y: number;
    tween: Phaser.Tweens.Tween | null;
  }[] = [];

  private readonly SOIL_BASE = 148;
  private readonly SOIL_BORDER_UP = 123;
  private readonly SOIL_BORDER_DOWN = 173;
  private readonly SOIL_BORDER_LEFT = 147;
  private readonly SOIL_BORDER_RIGHT = 149;
  private readonly SOIL_LR = 164;
  private readonly SOIL_UD = 165;
  private readonly SOIL_LRD = 189;
  private readonly SOIL_UDL = 190;
  private readonly SOIL_LRU = 214;
  private readonly SOIL_UDR = 215;
  private readonly SOIL_ALL = 239;
  private readonly SOIL_CORNER_UL = 264;
  private readonly SOIL_CORNER_UR = 265;
  private readonly SOIL_CORNER_DL = 266;
  private readonly SOIL_CORNER_DR = 267;

  // Seed/Crop related constants
  private readonly FARM_TILESET_NAME = "Farm";
  private readonly SEED_STAGE1_INDICES: { [key: string]: number } = {
    carrot: 27,
    radish: 77,
    cabbage: 127,
    lettuce: 177,
    cauliflower: 227,
    broccoli: 277,
    garlic: 327,
  };
  private readonly CROP_STAGES = 4;
  private readonly STEM_INDICES: { [key: string]: number } = {
    carrot: 5,
    radish: 55,
    garlic: 305,
  };

  private readonly HARVEST_INDICES: { [key: string]: number } = {
    carrot: 33,
    radish: 83,
    cabbage: 133,
    lettuce: 183,
    cauliflower: 233,
    broccoli: 283,
    garlic: 333,
  };

  // Offset constants for carried item positioning relative to the player
  private readonly PLAYER_CARRY_OFFSET_X = 0;
  private readonly PLAYER_CARRY_OFFSET_Y = -24;

  private readonly COLLISION_CHECK_LAYERS = [
    "Tile Layer -2",
    "Tile Layer -1",
    "Tile Layer 0",
    "Tile Layer 1",
    "Tile Layer 2",
    "Tile Layer 3",
    "Tile Layer 4",
    "Tile Layer 5",
  ];

  // Sound Effects
  private sfxCollect!: Phaser.Sound.BaseSound;
  private sfxCrush!: Phaser.Sound.BaseSound;
  private sfxWater!: Phaser.Sound.BaseSound;

  constructor() {
    super("main");
  }

  preload() {
    this.load.tilemapTiledJSON("map", "mapCopy.tmj");

    // Group images by path prefix
    const imageSets = {
      "Pixel Crawler - Free Pack/Environment/Tilesets/": [
        "Dungeon_Tiles",
        "Floors_Tiles",
        "Wall_Tiles",
        "Wall_Variations",
        "Water_tiles",
      ],
      "Pixel Crawler - Free Pack/Environment/Props/Static/": [
        "Vegetation",
        "Furniture",
        "Rocks",
        "Shadows",
      ],
      "Pixel Crawler - Free Pack/Environment/Structures/Buildings/": [
        "Props",
        "Roofs",
        "Walls",
        "Shadows1",
      ],
      "Pixel Crawler - Free Pack/Environment/Props/Static/Trees/Model_01/": [
        "Size_02",
        "Size_03",
        "Size_04",
        "Size_05",
      ],
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/": [
        "Level_1",
      ],
    };

    for (const pathPrefix in imageSets) {
      imageSets[pathPrefix as keyof typeof imageSets].forEach((name) => {
        this.load.image(name, `${pathPrefix}${name}.png`);
      });
    }

    // Load spritesheets with specific configurations
    this.load.spritesheet(
      "Farm",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Farm.png",
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet(
      "Level_2-Sheet",
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/Level_2-Sheet.png",
      { frameWidth: 80, frameHeight: 64 }
    );
    this.load.spritesheet(
      "Level_3-Sheet",
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/Level_3-Sheet.png",
      { frameWidth: 112, frameHeight: 80 }
    );

    // Load animation spritesheets
    const frameConfig = { frameWidth: 64, frameHeight: 64 };
    const animPrefixes = [
      "idle",
      "walk",
      "run",
      "hit",
      "carry_idle",
      "carry_walk",
      "carry_run",
      "collect",
      "crush",
      "pierce",
      "slice",
      "watering",
      "fishing",
    ];
    const animDirections = ["down", "up", "side"];

    animPrefixes.forEach((prefix) => {
      animDirections.forEach((dir) => {
        const key = `${prefix}_${dir}`;
        // Simplified path suffix logic (assuming consistent naming)
        const pathSuffix =
          dir === "side" ? "Side" : dir.charAt(0).toUpperCase() + dir.slice(1);
        const specialPierceUp = prefix === "pierce" && dir === "up";
        const actualSuffix = specialPierceUp ? "Top" : pathSuffix;

        const isCarryAnim = prefix.startsWith("carry");
        const baseFolderName =
          prefix
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())
            .replace(/ /g, "_") + (isCarryAnim ? "" : "_Base");
        const filenamePrefix = prefix
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())
          .replace(/ /g, "_");

        const fullPath = `Animations/${baseFolderName}/${filenamePrefix}_${actualSuffix}-Sheet.png`;
        this.load.spritesheet(key, fullPath, frameConfig);
      });
    });

    // Load Sound Effects (Assuming they are in assets/sounds/)
    this.load.audio("collect", "Sounds/collect.mp3");
    this.load.audio("crush", "Sounds/crush.mp3");
    this.load.audio("water", "Sounds/water.mp3");
  }

  create() {
    this.map = this.make.tilemap({ key: "map" });

    const tilesets = this.loadTilesets();
    this.createLayers(tilesets);
    this.initializePlayer();
    this.createAnimations();
    this.setupInput();
    this.setupCamera();
    this.initializeLayerReferences(tilesets);
    this.initializeSounds(); // Initialize sounds

    // Launch the UI Scene and get reference
    this.scene.launch("UIScene");
    this.uiScene = this.scene.get("UIScene") as UIScene;
  }

  private loadTilesets(): Phaser.Tilemaps.Tileset[] {
    const tilesets: Phaser.Tilemaps.Tileset[] = [];
    this.map.tilesets.forEach((mapTileset) => {
      const tileset = this.map.addTilesetImage(
        mapTileset.name,
        mapTileset.name
      );
      if (tileset) {
        tilesets.push(tileset);
      } else {
        console.error(`Failed to load tileset: ${mapTileset.name}`);
      }
    });

    // --- Create Crop Layer ---
    // Ensure Farm tileset is available before creating crop layer
    const farmTileset = this.map.getTileset(this.FARM_TILESET_NAME);
    if (!farmTileset) {
      console.error(
        `Tileset '${this.FARM_TILESET_NAME}' not found. Cannot create Crop Layer.`
      );
    } else {
      const tilesetsForCropLayer = tilesets.includes(farmTileset)
        ? tilesets
        : [...tilesets, farmTileset];

      const createdCropLayer = this.map.createBlankLayer(
        "Crop Layer",
        tilesetsForCropLayer,
        0,
        0
      );
      if (createdCropLayer) {
        this.cropLayer = createdCropLayer;
        this.cropLayer.setDepth(2); // Depth above soil, below player
      } else {
        console.error(
          "Failed to create Crop Layer object even with valid tileset."
        );
        // Handle the error appropriately, maybe disable planting?
      }

      // --- Create Stem Layer ---
      const createdStemLayer = this.map.createBlankLayer(
        "Stem Layer",
        tilesetsForCropLayer,
        0,
        0
      );
      if (createdStemLayer) {
        this.stemLayer = createdStemLayer;
        // Depth slightly above crops
        this.stemLayer.setDepth(
          this.cropLayer ? this.cropLayer.depth + 0.1 : 2.1
        );
      } else {
        console.error("Failed to create Stem Layer object.");
      }
      // --- End Create Stem Layer ---
    }
    // --- End Create Crop Layer ---

    return tilesets;
  }

  private createLayers(tilesets: Phaser.Tilemaps.Tileset[]): void {
    const layerDepthMap: { [key: string]: number } = {
      "-2": -2,
      "-1": -1,
      "0": 0,
      "1": 1,
      "2": 2,
      "4": 4,
      "5": 5,
    };

    this.map.layers.forEach((layerData) => {
      try {
        const createdLayer = this.map.createLayer(
          layerData.name,
          tilesets,
          0,
          0
        );
        if (createdLayer) {
          // Extract potential depth suffix (e.g., " 0", " -1", " 5")
          const nameParts = layerData.name.split(" ");
          const suffix = nameParts[nameParts.length - 1];
          // Use suffix to find depth, default to 0 if not found or not a number
          const depth = layerDepthMap[suffix] ?? 0;

          createdLayer.setDepth(depth);
          createdLayer.setVisible(layerData.visible); // Set visibility from Tiled
        } else {
          console.error(`Failed to create layer object: ${layerData.name}`);
        }
      } catch (error) {
        console.error(`Error creating layer ${layerData.name}:`, error);
      }
    });
  }

  private initializePlayer(): void {
    this.player = this.add.sprite(100, 100, "idle_down");
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(3);
  }

  private createAnimation(
    key: string,
    sheetKey: string,
    endFrame: number,
    frameRate: number,
    repeat: number = -1
  ): void {
    this.anims.create({
      key: key,
      frames: this.anims.generateFrameNumbers(sheetKey, { end: endFrame }),
      frameRate: frameRate,
      repeat: repeat,
    });
  }

  private createAnimations(): void {
    const idleFrameRate = this.baseFrameRate / 2;
    const walkFrameRate = this.baseFrameRate;
    const runFrameRate = this.baseFrameRate * 1.5;
    const actionFrameRate = this.actionFrameRate;
    const directions = ["down", "up", "side"];

    const animations = [
      // Standard Animations
      { prefix: "idle", endFrame: 3, frameRate: idleFrameRate, repeat: -1 },
      { prefix: "walk", endFrame: 5, frameRate: walkFrameRate, repeat: -1 },
      { prefix: "run", endFrame: 5, frameRate: runFrameRate, repeat: -1 },
      { prefix: "hit", endFrame: 3, frameRate: actionFrameRate, repeat: 0 },
      {
        prefix: "carry_idle",
        endFrame: 3,
        frameRate: idleFrameRate,
        repeat: -1,
      },
      {
        prefix: "carry_walk",
        endFrame: 5,
        frameRate: walkFrameRate,
        repeat: -1,
      },
      { prefix: "carry_run", endFrame: 5, frameRate: runFrameRate, repeat: -1 },
      // Action Animations
      { prefix: "collect", endFrame: 7, frameRate: actionFrameRate, repeat: 0 },
      { prefix: "crush", endFrame: 7, frameRate: actionFrameRate, repeat: 0 },
      { prefix: "pierce", endFrame: 7, frameRate: actionFrameRate, repeat: 0 },
      { prefix: "slice", endFrame: 7, frameRate: actionFrameRate, repeat: 0 },
      {
        prefix: "watering",
        endFrame: 7,
        frameRate: actionFrameRate,
        repeat: 0,
      },
      { prefix: "fishing", endFrame: 7, frameRate: actionFrameRate, repeat: 0 },
    ];

    animations.forEach((anim) => {
      directions.forEach((dir) => {
        const key = `${anim.prefix}_${dir}`;
        this.createAnimation(
          key,
          key,
          anim.endFrame,
          anim.frameRate,
          anim.repeat
        );
      });
    });

    this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isPerformingAction = false;
      const currentAnim = this.player.anims.currentAnim;
      if (currentAnim && !currentAnim.repeat) {
        const idleAnim = this.getCurrentIdleAnimKey();
        if (this.player.anims.currentAnim?.key !== idleAnim) {
          this.player.anims.play(idleAnim, true);
        }
      }
    });
  }

  private setupInput(): void {
    this.input.keyboard?.createCursorKeys();

    this.keys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SHIFT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };

    this.player.anims.play("idle_down", true);
    this.input.on("pointerdown", this.handlePointerDown, this);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.setZoom(5); // Re-enable zoom
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  private initializeLayerReferences(tilesets: Phaser.Tilemaps.Tileset[]): void {
    const grassLayer = this.map.getLayer("Tile Layer 0")?.tilemapLayer;
    if (grassLayer) {
      this.grassLayer = grassLayer;
    } else {
      console.error(
        "Failed to find 'Tile Layer 0'. Grass/Soil logic might fail."
      );
    }

    const soilLayer = this.map.getLayer("Tile Layer 1")?.tilemapLayer;
    if (soilLayer) {
      this.soilLayer = soilLayer;
    } else {
      console.warn(
        "Could not find 'Tile Layer 1'. Creating a blank one for soil."
      );
      const newSoilLayer = this.map.createBlankLayer(
        "Tile Layer 1",
        tilesets,
        0,
        0
      );
      if (newSoilLayer) {
        this.soilLayer = newSoilLayer;
        this.soilLayer.setDepth(1);
      } else {
        console.error(
          "Failed to create even a blank 'Tile Layer 1'. Soil placement will fail."
        );
      }
    }
  }

  private initializeSounds(): void {
    this.sfxCollect = this.sound.add("collect");
    this.sfxCrush = this.sound.add("crush");
    this.sfxWater = this.sound.add("water");
  }

  update(_: number, delta: number): void {
    this.updateCarriedItemPosition();
    this.handlePlayerMovement(delta);
    this.updatePlayerAnimation();
  }

  private updateCarriedItemPosition(): void {
    if (
      !this.isCarrying ||
      !this.carriedItemOriginalTile1 ||
      !this.carriedItemPart1Sprite
    ) {
      return;
    }

    // Use object destructuring with default values for relative offsets
    const { relativeOffsetX = 0, relativeOffsetY = -1 } =
      this.carriedItemOriginalTile1;

    // Use defined constants for base offsets
    const baseOffsetX = this.PLAYER_CARRY_OFFSET_X;
    const baseOffsetY = this.PLAYER_CARRY_OFFSET_Y;

    const magnitude =
      Math.sqrt(
        relativeOffsetX * relativeOffsetX + relativeOffsetY * relativeOffsetY
      ) || 1;
    const normX = relativeOffsetX / magnitude;
    const normY = relativeOffsetY / magnitude;

    const worldOffsetX = normX * (this.map.tileWidth / 2);
    const worldOffsetY = normY * (this.map.tileHeight / 2);

    this.carriedItemPart1Sprite.setPosition(
      this.player.x + baseOffsetX - worldOffsetX,
      this.player.y + baseOffsetY - worldOffsetY
    );

    if (this.carriedItemPart2Sprite) {
      this.carriedItemPart2Sprite.setPosition(
        this.player.x + baseOffsetX + worldOffsetX,
        this.player.y + baseOffsetY + worldOffsetY
      );
    }
  }

  private handlePlayerMovement(delta: number): void {
    if (this.isPerformingAction) {
      return;
    }

    const isMovingW = this.keys.W.isDown;
    const isMovingA = this.keys.A.isDown;
    const isMovingS = this.keys.S.isDown;
    const isMovingD = this.keys.D.isDown;
    const isRunning = this.keys.SHIFT.isDown;
    const isActivelyMoving = isMovingW || isMovingA || isMovingS || isMovingD;

    let moveX = 0;
    let moveY = 0;
    const currentSpeed = isRunning ? this.runSpeed : this.walkSpeed;

    if (isActivelyMoving) {
      if (isMovingW) {
        this.currentDir = "up";
        moveY = -currentSpeed;
      } else if (isMovingS) {
        this.currentDir = "down";
        moveY = currentSpeed;
      }

      if (isMovingA) {
        this.currentDir = "left";
        moveX = -currentSpeed;
        if (isMovingW || isMovingS) moveY = 0;
      } else if (isMovingD) {
        this.currentDir = "right";
        moveX = currentSpeed;
        if (isMovingW || isMovingS) moveY = 0;
      }
    }

    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
    if (magnitude > currentSpeed) {
      moveX = (moveX / magnitude) * currentSpeed;
      moveY = (moveY / magnitude) * currentSpeed;
    }

    const deltaFactor = delta / 1000;
    const newX = this.player.x + moveX * deltaFactor;
    const newY = this.player.y + moveY * deltaFactor;

    const canMoveX = !this.hasCollisionAtWorldXY(newX, this.player.y);
    const canMoveY = !this.hasCollisionAtWorldXY(this.player.x, newY);

    let actuallyMoved = false;
    if (canMoveX && moveX !== 0) {
      this.player.x = newX;
      actuallyMoved = true;
    }
    if (canMoveY && moveY !== 0) {
      this.player.y = newY;
      actuallyMoved = true;
    }
  }

  private updatePlayerAnimation(): void {
    if (this.isPerformingAction) {
      return;
    }

    // Use const for keys
    const { W, A, S, D, SHIFT } = this.keys;
    const isMoving = W.isDown || A.isDown || S.isDown || D.isDown;
    const isRunning = SHIFT.isDown;

    const basePrefix = this.isCarrying ? "carry_" : "";
    let statePrefix: string;

    if (isMoving) {
      statePrefix = isRunning ? `${basePrefix}run_` : `${basePrefix}walk_`;
    } else {
      statePrefix = this.isCarrying ? "carry_idle_" : "idle_";
    }

    // Determine direction suffix and flip based on currentDir
    const directionSuffix =
      this.currentDir === "up" || this.currentDir === "down"
        ? this.currentDir
        : "side";
    const flipX = this.currentDir === "left";
    const newAnimKey = `${statePrefix}${directionSuffix}`;

    this.player.setFlipX(flipX);

    // Play animation if it's different or not currently playing
    if (
      this.player.anims.currentAnim?.key !== newAnimKey ||
      !this.player.anims.isPlaying
    ) {
      this.player.anims.play(newAnimKey, true);
    }
  }

  private getCurrentIdleAnimKey(): string {
    const basePrefix = this.isCarrying ? "carry_idle_" : "idle_";
    const directionSuffix =
      this.currentDir === "up" || this.currentDir === "down"
        ? this.currentDir
        : "side";
    return `${basePrefix}${directionSuffix}`;
  }

  private getPlayerTileCoords(): { x: number | null; y: number | null } {
    const x = this.map.worldToTileX(this.player.x);
    const y = this.map.worldToTileY(this.player.y);
    return { x, y };
  }

  private getAdjacentTileCoords(
    baseX: number,
    baseY: number
  ): { x: number; y: number }[] {
    return [
      { x: baseX, y: baseY - 1 },
      { x: baseX, y: baseY + 1 },
      { x: baseX - 1, y: baseY },
      { x: baseX + 1, y: baseY },
    ];
  }

  private findAdjacentTileWithProperty(
    baseX: number,
    baseY: number,
    propertyName: string,
    propertyValue: any = true
  ): Phaser.Tilemaps.Tile | null {
    const adjacentCoords = this.getAdjacentTileCoords(baseX, baseY);

    for (const coord of adjacentCoords) {
      for (const layerName of this.COLLISION_CHECK_LAYERS) {
        const layer = this.map.getLayer(layerName)?.tilemapLayer;
        if (layer) {
          const tile = layer.getTileAt(coord.x, coord.y);
          if (tile?.properties?.[propertyName] === propertyValue) {
            return tile;
          }
        }
      }
    }
    return null;
  }

  private hasCollisionAtWorldXY(worldX: number, worldY: number): boolean {
    const tileX = this.map.worldToTileX(worldX);
    const tileY = this.map.worldToTileY(worldY);

    if (tileX === null || tileY === null) {
      // Coordinates are outside the map, treat as non-colliding or handle as needed
      // console.warn(`Collision check outside map bounds: ${worldX}, ${worldY}`);
      return false; // Or true, depending on desired behavior for off-map checks
    }

    for (const layerName of this.COLLISION_CHECK_LAYERS) {
      const layer = this.map.getLayer(layerName)?.tilemapLayer;
      if (layer?.visible) {
        const tile = layer.getTileAt(tileX, tileY);
        if (tile?.properties?.collision === true) {
          return true; // Space has a collision marker on some layer
        }
      }
    }
    return false;
  }

  private handlePointerDown() {
    if (this.isPerformingAction) return;

    if (this.isCarrying) {
      this.putDownTwoPartItem();
      return;
    }

    const { x: playerTileX, y: playerTileY } = this.getPlayerTileCoords();
    if (playerTileX === null || playerTileY === null) return;

    const interactionChecks = [
      this.tryCropInteraction,
      this.tryStumpInteraction,
      this.tryWaterInteraction,
      this.tryPickupInteraction,
      this.tryGrassRemovalInteraction,
      this.trySoilPlacementInteraction,
    ];

    for (const checkInteraction of interactionChecks) {
      if (checkInteraction.call(this, playerTileX, playerTileY)) {
        return;
      }
    }
  }

  private tryCropInteraction(
    playerTileX: number,
    playerTileY: number
  ): boolean {
    if (!this.soilLayer || !this.cropLayer || !this.uiScene) return false;

    const soilTile = this.soilLayer.getTileAt(playerTileX, playerTileY);
    const cropTile = this.cropLayer.getTileAt(playerTileX, playerTileY);
    const farmTileset = this.map.getTileset(this.FARM_TILESET_NAME);

    if (!farmTileset) {
      console.error("Farm tileset not found for crop interaction.");
      return false;
    }

    if (cropTile) {
      const baseIndex = cropTile.index - farmTileset.firstgid;
      const { seedId, stage } = this.getCropInfoFromIndex(baseIndex);

      if (seedId && stage) {
        if (stage < this.CROP_STAGES) {
          // --- Water existing crop to grow ---
          const nextStage = stage + 1;
          // TODO: Optionally check if watering can/fertilizer is selected?
          const nextStageBaseIndex = baseIndex + 1;
          const nextStageGlobalIndex =
            nextStageBaseIndex + farmTileset.firstgid;

          // Check if this next stage needs a stem
          const needsStem =
            nextStage === this.CROP_STAGES &&
            this.STEM_INDICES[seedId] !== undefined;

          this.performAction("watering", () => {
            this.cropLayer.putTileAt(
              nextStageGlobalIndex,
              playerTileX,
              playerTileY
            );
            // Optionally update soilTile.properties.stage = stage + 1; if needed

            // Add or remove stem as needed
            if (needsStem) {
              const stemBaseIndex = this.STEM_INDICES[seedId];
              const stemGlobalIndex = stemBaseIndex + farmTileset.firstgid;
              this.stemLayer?.putTileAt(
                stemGlobalIndex,
                playerTileX,
                playerTileY - 1
              ); // Place stem above
            } else {
              // Ensure no stem is present if not needed for this stage (e.g. if logic changes later)
              this.stemLayer?.removeTileAt(playerTileX, playerTileY - 1);
            }
          });
          return true;
        } else if (stage === this.CROP_STAGES) {
          // --- Harvest fully grown crop ---
          const hadStem = this.STEM_INDICES[seedId] !== undefined;
          this.performAction("collect", () => {
            this.cropLayer.removeTileAt(playerTileX, playerTileY);
            // Remove stem if this crop had one
            if (hadStem) {
              this.stemLayer?.removeTileAt(playerTileX, playerTileY - 1);
            }
            console.log(
              `Harvesting: Soil tile [${playerTileX},${playerTileY}] props BEFORE:`,
              JSON.stringify(soilTile?.properties)
            );
            if (soilTile) {
              if (!soilTile.properties) soilTile.properties = {};
              delete soilTile.properties.crop;
              soilTile.properties.emptyPlot = true;
              console.log(
                `Harvesting: Soil tile [${playerTileX},${playerTileY}] props AFTER:`,
                JSON.stringify(soilTile.properties)
              );
              this.addGlowEffect(soilTile);
              this.updateGlowSequence();
            } else {
              console.warn(
                `Could not find underlying soil tile at ${playerTileX}, ${playerTileY} during harvest.`
              );
            }

            // --- Add Harvest Effect ---
            const harvestIconBaseIndex = this.HARVEST_INDICES[seedId];
            if (harvestIconBaseIndex !== undefined && farmTileset) {
              // For spritesheets like 'Farm', the frame index is the base index
              const harvestFrameIndex = harvestIconBaseIndex;
              const worldX = this.map.tileToWorldX(playerTileX);
              const worldY = this.map.tileToWorldY(playerTileY);

              if (worldX !== null && worldY !== null) {
                const centerX = worldX + this.map.tileWidth / 2;
                const centerY = worldY + this.map.tileHeight / 2;

                const icon = this.add.sprite(
                  centerX,
                  centerY,
                  this.FARM_TILESET_NAME,
                  harvestFrameIndex
                );
                icon.setDepth(this.player.depth + 2); // Above player/action effects

                const text = this.add.text(centerX + 10, centerY - 5, "+1", {
                  font: "10px monospace",
                  color: "#ffffff",
                  stroke: "#000000",
                  strokeThickness: 2,
                });
                text.setOrigin(0, 0.5);
                text.setDepth(icon.depth);

                const duration = 1000; // ms
                const floatHeight = 30; // pixels

                this.tweens.add({
                  targets: [icon, text],
                  y: `-=${floatHeight}`,
                  alpha: { from: 1, to: 0 },
                  duration: duration,
                  ease: "Linear",
                  onComplete: () => {
                    icon.destroy();
                    text.destroy();
                  },
                });
              }
            }
            // --- End Harvest Effect ---
          });
          return true;
        }
      } else {
        console.warn(
          `Crop tile at ${playerTileX}, ${playerTileY} has unrecognized index: ${cropTile.index}`
        );
      }
      return false;
    } else if (soilTile?.properties?.emptyPlot === true) {
      const selectedItemId = this.uiScene.getSelectedItemId();

      if (
        selectedItemId &&
        this.SEED_STAGE1_INDICES[selectedItemId] !== undefined
      ) {
        const stage1BaseIndex = this.SEED_STAGE1_INDICES[selectedItemId];
        const stage1GlobalIndex = stage1BaseIndex + farmTileset.firstgid;

        this.performAction("watering", () => {
          console.log(
            `Planting: Soil tile [${playerTileX},${playerTileY}] props BEFORE:`,
            JSON.stringify(soilTile?.properties)
          );
          const plantedTile = this.cropLayer.putTileAt(
            stage1GlobalIndex,
            playerTileX,
            playerTileY
          );
          if (plantedTile) {
            // Update the underlying soil tile properties
            soilTile.properties.crop = selectedItemId; // Store crop name
            delete soilTile.properties.emptyPlot; // Remove emptyPlot flag
            console.log(
              `Planting: Soil tile [${playerTileX},${playerTileY}] props AFTER delete:`,
              JSON.stringify(soilTile.properties)
            );

            // Remove the glow effect from this plot
            this.removeGlowEffect(playerTileX, playerTileY);
          }
        });
        return true;
      }
    }

    return false;
  }

  private tryStumpInteraction(
    playerTileX: number,
    playerTileY: number
  ): boolean {
    const adjacentStump = this.findAdjacentTileWithProperty(
      playerTileX,
      playerTileY,
      "stump"
    );
    if (adjacentStump) {
      this.performAction("slice", () => this.cutTree(adjacentStump));
      return true;
    }
    return false;
  }

  private tryWaterInteraction(
    playerTileX: number,
    playerTileY: number
  ): boolean {
    const adjacentWater = this.findAdjacentTileWithProperty(
      playerTileX,
      playerTileY,
      "water"
    );
    if (adjacentWater) {
      this.performAction("fishing");
      return true;
    }
    return false;
  }

  private tryPickupInteraction(
    playerTileX: number,
    playerTileY: number
  ): boolean {
    let tile1: Phaser.Tilemaps.Tile | null = null;
    let tile2: Phaser.Tilemaps.Tile | null = null;

    for (const layerName of this.COLLISION_CHECK_LAYERS) {
      const layer = this.map.getLayer(layerName)?.tilemapLayer;
      if (!layer) continue;

      const tileUnderPlayer = layer.getTileAt(playerTileX, playerTileY);

      if (tileUnderPlayer?.properties?.canPickup1_2 === true) {
        const potentialPartner = layer.getTileAt(playerTileX, playerTileY - 1);
        if (potentialPartner?.properties?.canPickup2_2 === true) {
          tile1 = tileUnderPlayer;
          tile2 = potentialPartner;
          break;
        }
      } else if (tileUnderPlayer?.properties?.canPickup2_2 === true) {
        const potentialPartner = layer.getTileAt(playerTileX, playerTileY + 1);
        if (potentialPartner?.properties?.canPickup1_2 === true) {
          tile1 = potentialPartner;
          tile2 = tileUnderPlayer;
          break;
        }
      }
    }

    if (tile1 && tile2) {
      this.pickupTwoPartItem(tile1, tile2);
      return true;
    }
    return false;
  }

  private tryGrassRemovalInteraction(
    playerTileX: number,
    playerTileY: number
  ): boolean {
    // Prevent action if there's already a crop here
    if (this.cropLayer?.getTileAt(playerTileX, playerTileY)) {
      return false;
    }

    if (this.grassLayer?.getTileAt(playerTileX, playerTileY)) {
      this.performAction("crush", () => {
        this.grassLayer.removeTileAt(playerTileX, playerTileY);
        this.updateGrassBorders(playerTileX, playerTileY);
      });
      return true;
    }
    return false;
  }

  private trySoilPlacementInteraction(
    playerTileX: number,
    playerTileY: number
  ): boolean {
    // Prevent action if there's already a crop here
    if (this.cropLayer?.getTileAt(playerTileX, playerTileY)) {
      return false;
    }

    if (this.canPlaceSoil(playerTileX, playerTileY)) {
      // ++ Add conflict check before performing action ++
      if (this.checkSoilPlacementConflict(playerTileX, playerTileY)) {
        return false; // Conflict detected, do not proceed or play animation
      }
      // -- End conflict check --

      this.performAction("crush", () =>
        this.placeSoilTile(playerTileX, playerTileY)
      );
      return true;
    }
    return false;
  }

  private performAction(
    actionAnimPrefix: string,
    onComplete?: () => void
  ): void {
    if (this.isPerformingAction) return;

    this.isPerformingAction = true;

    // Play corresponding sound effect
    switch (actionAnimPrefix) {
      case "collect":
        this.sfxCollect?.play();
        break;
      case "crush":
        this.sfxCrush?.play();
        break;
      case "watering":
        this.sfxWater?.play();
        break;
      // Add cases for other actions if needed
    }

    const directionSuffix =
      this.currentDir === "up" || this.currentDir === "down"
        ? this.currentDir
        : "side";
    const actionAnimKey = `${actionAnimPrefix}_${directionSuffix}`;
    const flipX = this.currentDir === "left";

    this.player.setFlipX(flipX);

    this.player.anims.play(actionAnimKey, true);

    // Execute the action logic immediately
    if (onComplete) {
      onComplete();
    }

    // Reset isPerformingAction when the animation *actually* completes
    // The existing listener handles this:
    // this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE, ...)
  }

  private pickupTwoPartItem(
    tile1: Phaser.Tilemaps.Tile,
    tile2: Phaser.Tilemaps.Tile
  ): void {
    if (
      !tile1.tilemapLayer ||
      !tile2.tilemapLayer ||
      !tile1.tileset ||
      !tile2.tileset
    ) {
      console.error("Cannot pick up item: Tile layer or tileset missing.");
      return;
    }

    this.isCarrying = true;

    const relOffsetX = tile2.x - tile1.x;
    const relOffsetY = tile2.y - tile1.y;

    this.carriedItemOriginalTile1 = {
      x: tile1.x,
      y: tile1.y,
      index: tile1.index,
      layer: tile1.tilemapLayer,
      tileset: tile1.tileset,
      relativeOffsetX: relOffsetX,
      relativeOffsetY: relOffsetY,
    };
    this.carriedItemOriginalTile2 = {
      x: tile2.x,
      y: tile2.y,
      index: tile2.index,
      layer: tile2.tilemapLayer,
      tileset: tile2.tileset,
    };

    tile1.tilemapLayer.removeTileAt(tile1.x, tile1.y);
    tile2.tilemapLayer.removeTileAt(tile2.x, tile2.y);

    const tilesetKey1 = tile1.tileset.name;
    const frameIndex1 = tile1.index - tile1.tileset.firstgid;
    const tilesetKey2 = tile2.tileset.name;
    const frameIndex2 = tile2.index - tile2.tileset.firstgid;

    this.carriedItemPart1Sprite = this.add.sprite(
      this.player.x,
      this.player.y,
      tilesetKey1,
      frameIndex1
    );
    this.carriedItemPart2Sprite = this.add.sprite(
      this.player.x,
      this.player.y,
      tilesetKey2,
      frameIndex2
    );

    const carriedItemDepth = this.player.depth + 1;
    this.carriedItemPart1Sprite.setDepth(carriedItemDepth);
    this.carriedItemPart2Sprite.setDepth(carriedItemDepth);

    this.player.anims.play(this.getCurrentIdleAnimKey(), true);
    this.updateCarriedItemPosition();
  }

  private putDownTwoPartItem() {
    if (!this.carriedItemOriginalTile1 || !this.carriedItemOriginalTile2) {
      console.warn("Attempted to put down item, but no item data stored.");
      this.resetCarriedState();
      return;
    }

    const { x: playerTileX, y: playerTileY } = this.getPlayerTileCoords();
    if (playerTileX === null || playerTileY === null) {
      console.warn("Cannot place item: Invalid player tile coordinates.");
      return;
    }

    let dropTileX1 = playerTileX;
    let dropTileY1 = playerTileY;

    // Use a map for direction offsets
    const directionOffsets: { [key: string]: { x: number; y: number } } = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const offset = directionOffsets[this.currentDir];
    if (offset) {
      dropTileX1 += offset.x;
      dropTileY1 += offset.y;
    }

    const relOffsetX = this.carriedItemOriginalTile1.relativeOffsetX ?? 0;
    const relOffsetY = this.carriedItemOriginalTile1.relativeOffsetY ?? -1; // Default assumption if missing
    const dropTileX2 = dropTileX1 + relOffsetX;
    const dropTileY2 = dropTileY1 + relOffsetY;

    const targetLayer = this.carriedItemOriginalTile1.layer;

    const canPlaceTile1 = this.canPlaceTileAt(
      targetLayer,
      dropTileX1,
      dropTileY1
    );
    const canPlaceTile2 = this.canPlaceTileAt(
      targetLayer,
      dropTileX2,
      dropTileY2
    );

    if (!canPlaceTile1 || !canPlaceTile2) {
      return;
    }

    const newTile1 = targetLayer.putTileAt(
      this.carriedItemOriginalTile1.index,
      dropTileX1,
      dropTileY1
    );
    const newTile2 = targetLayer.putTileAt(
      this.carriedItemOriginalTile2.index,
      dropTileX2,
      dropTileY2
    );

    if (newTile1) {
      if (!newTile1.properties) newTile1.properties = {};
      newTile1.properties.canPickup1_2 = true;
    }
    if (newTile2) {
      if (!newTile2.properties) newTile2.properties = {};
      newTile2.properties.canPickup2_2 = true;
    }

    this.resetCarriedState();
  }

  private canPlaceTileAt(
    layer: Phaser.Tilemaps.TilemapLayer,
    tileX: number,
    tileY: number
  ): boolean {
    if (tileX === null || tileY === null) return false;

    if (
      tileX < 0 ||
      tileY < 0 ||
      tileX >= layer.width ||
      tileY >= layer.height
    ) {
      return false;
    }

    const existingTile = layer.getTileAt(tileX, tileY);
    if (existingTile) {
      return false;
    }

    const worldX = this.map.tileToWorldX(tileX);
    const worldY = this.map.tileToWorldY(tileY);

    // Check if conversion resulted in null (e.g., tile coords invalid)
    if (worldX === null || worldY === null) {
      console.warn(
        `Cannot check collision for placement: Invalid world coordinates for tile ${tileX}, ${tileY}`
      );
      return false;
    }

    // Adjust to check center of the tile
    const checkWorldX = worldX + this.map.tileWidth / 2;
    const checkWorldY = worldY + this.map.tileHeight / 2;

    if (this.hasCollisionAtWorldXY(checkWorldX, checkWorldY)) {
      return false;
    }

    return true;
  }

  private resetCarriedState(): void {
    this.carriedItemPart1Sprite?.destroy();
    this.carriedItemPart2Sprite?.destroy();
    this.carriedItemPart1Sprite = null;
    this.carriedItemPart2Sprite = null;
    this.carriedItemOriginalTile1 = null;
    this.carriedItemOriginalTile2 = null;
    this.isCarrying = false;

    this.player.anims.play(this.getCurrentIdleAnimKey(), true);
  }

  private calculateGrassTileIndex(
    tileX: number,
    tileY: number,
    removedX: number,
    removedY: number
  ): number | null {
    if (!this.grassLayer) return null;

    const isNeighborGrass = (nx: number, ny: number): boolean => {
      if (nx === removedX && ny === removedY) return false;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= this.grassLayer.width ||
        ny >= this.grassLayer.height
      )
        return false;
      return this.grassLayer.getTileAt(nx, ny) !== null;
    };

    let mask = 0;
    if (isNeighborGrass(tileX, tileY - 1)) mask |= 1;
    if (isNeighborGrass(tileX + 1, tileY - 1)) mask |= 2;
    if (isNeighborGrass(tileX + 1, tileY)) mask |= 4;
    if (isNeighborGrass(tileX + 1, tileY + 1)) mask |= 8;
    if (isNeighborGrass(tileX, tileY + 1)) mask |= 16;
    if (isNeighborGrass(tileX - 1, tileY + 1)) mask |= 32;
    if (isNeighborGrass(tileX - 1, tileY)) mask |= 64;
    if (isNeighborGrass(tileX - 1, tileY - 1)) mask |= 128;

    const tileIndexMap_8Way: { [key: number]: number | null } = {
      0: 53, // No neighbors (surrounded by non-grass) -> Center piece? Looks like '0' maps to center tile
      1: 56, // N
      2: 53, // E
      3: 56, // NE
      4: 57, // S
      5: 28, // NS
      6: 57, // ES
      7: 28, // NES
      8: 53, // W
      9: 56, // NW
      10: 53, // EW
      11: 56, // NEW
      12: 57, // SW
      13: 28, // NSW
      14: 57, // ESW
      15: 28, // NESW (Full border)
      16: 32, // W (Single neighbor on the left)
      17: 52, // NW + W
      18: 32, // EW (Horizontal line segment)
      19: 52, // NEW + W
      20: 78, // SW + W
      21: 54, // NSW + W
      22: 78, // ESW + W
      23: 54, // NESW + W
      24: 32, // S + W
      25: 52, // NS + W
      26: 32, // ES + W
      27: 52, // NES + W
      28: 78, // N + W
      29: 54, // NE + W
      30: 78, // N + EW
      31: 54, // N + ESW
      32: 53, // SE
      33: 56, // SE + N
      34: 53, // SE + E
      35: 56, // SE + NE
      36: 57, // SE + S
      37: 28, // SE + NS
      38: 57, // SE + ES
      39: 28, // SE + NES
      40: 53, // SE + W
      41: 56, // SE + NW
      42: 53, // SE + EW
      43: 56, // SE + NEW
      44: 57, // SE + SW
      45: 28, // SE + NSW
      46: 57, // SE + ESW
      47: 28, // SE + NESW
      48: 32, // SE + S + W
      49: 52, // SE + NS + W
      50: 32, // SE + ES + W
      51: 52, // SE + NES + W
      52: 78, // SE + N + W
      53: 54, // SE + NE + W
      54: 78, // SE + N + EW
      55: 54, // SE + N + ESW
      56: 32, // E
      57: 52, // NE + E
      58: 32, // ES + E
      59: 52, // NES + E
      60: 78, // EW + E (Redundant E)
      61: 54, // NEW + E
      62: 78, // ESW + E
      63: 54, // NESW + E
      64: 82, // NW
      65: 26, // NW + N
      66: 82, // NW + E
      67: 26, // NW + NE
      68: 77, // NW + S
      69: 2, // NW + NS
      70: 77, // NW + ES
      71: 2, // NW + NES
      72: 82, // NW + W (Redundant W)
      73: 26, // NW + NW (Redundant NW)
      74: 82, // NW + EW
      75: 26, // NW + NEW
      76: 77, // NW + SW
      77: 2, // NW + NSW
      78: 77, // NW + ESW
      79: 2, // NW + NESW
      80: 76, // N + SE
      81: 50, // N + SE + N (Redundant N)
      82: 76, // N + SE + E
      83: 50, // N + SE + NE
      84: 102, // N + SE + S
      85: 103, // N + SE + NS
      86: 102, // N + SE + ES
      88: 76, // N + SE + W
      89: 50, // N + SE + NW
      90: 76, // N + SE + EW
      91: 50, // N + SE + NEW
      92: 102, // N + SE + SW
      94: 102, // N + SE + ESW
      95: 103, // N + SE + NESW
      96: 82, // W + SE
      97: 26, // W + SE + N
      98: 82, // W + SE + E
      99: 26, // W + SE + NE
      100: 77, // W + SE + S
      101: 2, // W + SE + NS
      102: 77, // W + SE + ES
      103: 2, // W + SE + NES
      104: 82, // W + SE + W (Redundant W)
      105: 26, // W + SE + NW
      106: 82, // W + SE + EW
      107: 26, // W + SE + NEW
      108: 77, // W + SE + SW
      109: 2, // W + SE + NSW
      110: 77, // W + SE + ESW
      111: 2, // W + SE + NESW
      112: 76, // S + SE
      113: 50, // S + SE + N
      114: 76, // S + SE + E
      115: 50, // S + SE + NE
      116: 102, // S + SE + S (Redundant S)
      117: 103, // S + SE + NS
      118: 102, // S + SE + ES
      119: 79, // S + SE + NES
      120: 76, // S + SE + W
      121: 50, // S + SE + NW
      122: 76, // S + SE + EW
      123: 50, // S + SE + NEW
      124: 102, // S + SE + SW
      125: 103, // S + SE + NSW
      126: 102, // S + SE + ESW
      127: 79, // S + SE + NESW (All but W)
      128: 53, // SW
      129: 56, // SW + N
      130: 53, // SW + E
      131: 56, // SW + NE
      132: 57, // SW + S
      133: 28, // SW + NS
      134: 57, // SW + ES
      135: 28, // SW + NES
      136: 53, // SW + W
      137: 56, // SW + NW
      138: 53, // SW + EW
      139: 56, // SW + NEW
      140: 57, // SW + SW (Redundant SW)
      141: 28, // SW + NSW
      142: 57, // SW + ESW
      143: 28, // SW + NESW
      144: 32, // SW + S + W
      145: 52, // SW + NS + W
      146: 32, // SW + ES + W
      147: 52, // SW + NES + W
      148: 78, // SW + N + W
      149: 54, // SW + NE + W
      150: 78, // SW + N + EW
      151: 54, // SW + N + ESW
      152: 32, // SW + E + W
      153: 52, // SW + NE + EW
      154: 32, // SW + ES + EW
      155: 52, // SW + NES + EW
      156: 78, // SW + W + W (Redundant W)
      157: 54, // SW + NW + W
      158: 78, // SW + EW + W
      159: 54, // SW + NEW + W
      160: 53, // N + SW
      161: 56, // N + SW + N (Redundant N)
      162: 53, // N + SW + E
      163: 56, // N + SW + NE
      164: 57, // N + SW + S
      165: 28, // N + SW + NS
      166: 57, // N + SW + ES
      167: 28, // N + SW + NES
      168: 53, // N + SW + W
      169: 56, // N + SW + NW
      170: 53, // N + SW + EW
      171: 56, // N + SW + NEW
      172: 57, // N + SW + SW
      173: 28, // N + SW + NSW
      174: 57, // N + SW + ESW
      175: 28, // N + SW + NESW
      176: 32, // E + SW
      177: 52, // E + SW + N
      178: 32, // E + SW + E (Redundant E)
      179: 52, // E + SW + NE
      180: 78, // E + SW + S
      181: 54, // E + SW + NS
      182: 78, // E + SW + ES
      183: 54, // E + SW + NES
      184: 32, // E + SW + W
      185: 52, // E + SW + NW
      186: 32, // E + SW + EW
      187: 52, // E + SW + NEW
      188: 78, // E + SW + SW
      189: 54, // E + SW + NSW
      190: 78, // E + SW + ESW
      191: 54, // E + SW + NESW (All but W)
      192: 82, // NE + SW
      193: 26, // NE + SW + N
      194: 82, // NE + SW + E
      195: 26, // NE + SW + NE (Redundant NE)
      196: 77, // NE + SW + S
      197: 2, // NE + SW + NS
      198: 77, // NE + SW + ES
      199: 2, // NE + SW + NES
      200: 82, // NE + SW + W
      201: 26, // NE + SW + NW
      202: 82, // NE + SW + EW
      203: 26, // NE + SW + NEW
      204: 77, // NE + SW + SW
      205: 2, // NE + SW + NSW
      206: 77, // NE + SW + ESW
      207: 2, // NE + SW + NESW
      208: 76, // S + SW
      209: 50, // S + SW + N
      210: 76, // S + SW + E
      211: 50, // S + SW + NE
      212: 102, // S + SW + S (Redundant S)
      213: 103, // S + SW + NS
      214: 102, // S + SW + ES
      215: 3, // S + SW + NES
      216: 76, // S + SW + W
      217: 50, // S + SW + NW
      218: 76, // S + SW + EW
      219: 50, // S + SW + NEW
      220: 102, // S + SW + SW (Redundant SW)
      221: 75, // S + SW + NSW
      222: 102, // S + SW + ESW
      223: 29, // S + SW + NESW (All but NW)
      224: 82, // ES + SW
      225: 26, // ES + SW + N
      226: 82, // ES + SW + E
      227: 26, // ES + SW + NE
      228: 77, // ES + SW + S
      229: 2, // ES + SW + NS
      230: 77, // ES + SW + ES (Redundant ES)
      231: 2, // ES + SW + NES
      232: 82, // ES + SW + W
      233: 26, // ES + SW + NW
      234: 82, // ES + SW + EW
      235: 26, // ES + SW + NEW
      236: 77, // ES + SW + SW
      237: 2, // ES + SW + NSW
      238: 77, // ES + SW + ESW
      239: 2, // ES + SW + NESW (All but NW)
      240: 76, // NES + SW
      241: 50, // NES + SW + N
      242: 76, // NES + SW + E
      243: 50, // NES + SW + NE
      244: 102, // NES + SW + S
      245: 101, // NES + SW + NS
      246: 102, // NES + SW + ES
      247: 25, // NES + SW + NES (Redundant NES)
      248: 76, // NES + SW + W
      249: 50, // NES + SW + NW
      250: 76, // NES + SW + EW
      251: 50, // NES + SW + NEW
      252: 102, // NES + SW + SW
      253: 75, // NES + SW + NSW
      254: 102, // NES + SW + ESW
      255: 252, // All Neighbors -> Inner piece?
    };

    let resultIndex = tileIndexMap_8Way[mask];

    if (resultIndex === undefined) {
      console.warn(
        `Undefined grass tile mask: ${mask} at ${tileX},${tileY}. Defaulting to 252.`
      );
      resultIndex = 252;
    }

    return resultIndex;
  }

  private updateGrassBorders(targetX: number, targetY: number): void {
    const tileset = this.map.getTileset("Floors_Tiles");
    if (!this.grassLayer || !tileset) {
      console.error("Cannot update grass borders: Layer or tileset missing.");
      return;
    }
    const firstGid = tileset.firstgid;

    for (let y = targetY - 1; y <= targetY + 1; y++) {
      for (let x = targetX - 1; x <= targetX + 1; x++) {
        if (x === targetX && y === targetY) continue;

        if (
          x < 0 ||
          y < 0 ||
          x >= this.grassLayer.width ||
          y >= this.grassLayer.height
        )
          continue;

        const currentTile = this.grassLayer.getTileAt(x, y);
        if (currentTile) {
          const localIndex = this.calculateGrassTileIndex(
            x,
            y,
            targetX,
            targetY
          );

          if (localIndex !== null && localIndex >= 0) {
            const globalIndex = firstGid + localIndex;
            if (currentTile.index !== globalIndex) {
              this.grassLayer.putTileAt(globalIndex, x, y);
            }
          } else {
            console.warn(
              `Grass tile at ${x},${y} resulted in null index after neighbor removal. Removing.`
            );
            this.grassLayer.removeTileAt(x, y);
          }
        }
      }
    }
  }

  private findConnectedTiles(
    startX: number,
    startY: number,
    propertyName: string,
    layersToCheck: string[],
    propertyValue: any = true
  ): Phaser.Tilemaps.Tile[] {
    const foundTiles: Phaser.Tilemaps.Tile[] = [];
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const visited: Set<string> = new Set();
    const startKey = `${startX},${startY}`;

    let startTile: Phaser.Tilemaps.Tile | null = null;
    for (const layerName of layersToCheck) {
      const layer = this.map.getLayer(layerName)?.tilemapLayer;
      if (layer) {
        const tile = layer.getTileAt(startX, startY);
        if (tile?.properties?.[propertyName] === propertyValue) {
          startTile = tile;
          break;
        }
      }
    }

    if (!startTile) {
      return [];
    }

    visited.add(startKey);
    foundTiles.push(startTile);

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const neighbors = this.getAdjacentTileCoords(current.x, current.y);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(neighborKey)) {
          visited.add(neighborKey);

          let neighborTileToAdd: Phaser.Tilemaps.Tile | null = null;
          for (const layerName of layersToCheck) {
            const layer = this.map.getLayer(layerName)?.tilemapLayer;
            if (layer) {
              const tile = layer.getTileAt(neighbor.x, neighbor.y);
              if (tile?.properties?.[propertyName] === propertyValue) {
                neighborTileToAdd = tile;
                break;
              }
            }
          }

          if (neighborTileToAdd) {
            queue.push(neighbor);
            foundTiles.push(neighborTileToAdd);
          }
        }
      }
    }

    return foundTiles;
  }

  private cutTree(initialStumpTile: Phaser.Tilemaps.Tile): void {
    const stumpTiles = this.findConnectedTiles(
      initialStumpTile.x,
      initialStumpTile.y,
      "stump",
      this.COLLISION_CHECK_LAYERS
    );

    if (stumpTiles.length === 0) {
      console.warn(
        "CutTree called but no connected stump tiles found, including the initial one."
      );
      return;
    }

    const allTreeTiles: Phaser.Tilemaps.Tile[] = [];
    const treeTilesSet: Set<string> = new Set();

    stumpTiles.forEach((stump) => {
      const neighbors = this.getAdjacentTileCoords(stump.x, stump.y);
      neighbors.forEach((neighborCoord) => {
        for (const layerName of this.COLLISION_CHECK_LAYERS) {
          const layer = this.map.getLayer(layerName)?.tilemapLayer;
          const potentialTreeTile = layer?.getTileAt(
            neighborCoord.x,
            neighborCoord.y
          );

          if (potentialTreeTile?.properties?.tree === true) {
            const connectedTreeGroup = this.findConnectedTiles(
              potentialTreeTile.x,
              potentialTreeTile.y,
              "tree",
              this.COLLISION_CHECK_LAYERS
            );

            connectedTreeGroup.forEach((treeTile) => {
              const key = `${treeTile.x},${treeTile.y}`;
              if (!treeTilesSet.has(key)) {
                treeTilesSet.add(key);
                allTreeTiles.push(treeTile);
              }
            });
            break;
          }
        }
      });
    });

    allTreeTiles.forEach((treeTile) => {
      treeTile.setVisible(false);
      if (!treeTile.properties) treeTile.properties = {};
      treeTile.properties.tree = false;
    });

    stumpTiles.forEach((stump) => {
      if (!stump.properties) stump.properties = {};
      stump.properties.cut = true;
    });
  }

  private canPlaceSoil(targetX: number, targetY: number): boolean {
    if (!this.grassLayer || !this.soilLayer) return false;

    if (this.grassLayer.getTileAt(targetX, targetY) !== null) {
      return false;
    }

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (this.grassLayer.getTileAt(targetX + dx, targetY + dy) !== null) {
          return false;
        }
      }
    }

    const worldX = this.map.tileToWorldX(targetX);
    const worldY = this.map.tileToWorldY(targetY);

    if (worldX === null || worldY === null) {
      console.warn(
        `Cannot check collision for soil placement: Invalid world coordinates for tile ${targetX}, ${targetY}`
      );
      return false;
    }

    // Adjust to check center of the tile
    const checkWorldX = worldX + this.map.tileWidth / 2;
    const checkWorldY = worldY + this.map.tileHeight / 2;

    if (this.hasCollisionAtWorldXY(checkWorldX, checkWorldY)) {
      return false;
    }

    return true;
  }

  private placeSoilTile(targetX: number, targetY: number): void {
    const farmTileset = this.map.getTileset("Farm");
    if (!this.soilLayer || !farmTileset) {
      console.error("Cannot place soil: Layer or Farm tileset missing.");
      return;
    }

    const baseSoilIndex = this.SOIL_BASE + farmTileset.firstgid;
    const newTile = this.soilLayer.putTileAt(baseSoilIndex, targetX, targetY);

    if (newTile) {
      const baseTileProps = (farmTileset.tileProperties as any)?.[
        this.SOIL_BASE
      ];
      if (baseTileProps) {
        newTile.properties = { ...baseTileProps };
      } else {
        if (!newTile.properties) newTile.properties = {};
      }

      if (newTile.properties?.emptyPlot === true) {
        this.addGlowEffect(newTile);
        this.updateGlowSequence();
      }
    } else {
      console.error(`Failed to place soil tile at ${targetX}, ${targetY}.`);
      return;
    }

    // --- REMOVE Conflict Check and Rollback Logic ---
    // [Rollback logic previously here is now removed]
    // --- End REMOVED Conflict Check ---

    // If no conflicts (checked earlier), proceed to update borders
    this.updateAdjacentSoilBorder(targetX, targetY);
    this.updateAdjacentSoilBorder(targetX, targetY - 1);
    this.updateAdjacentSoilBorder(targetX, targetY + 1);
    this.updateAdjacentSoilBorder(targetX - 1, targetY);
    this.updateAdjacentSoilBorder(targetX + 1, targetY);

    this.updateGlowSequence();
  }

  private addGlowEffect(tile: Phaser.Tilemaps.Tile): void {
    // Check if a glow already exists for this tile
    console.log(`addGlowEffect called for tile [${tile.x},${tile.y}]`);
    const existingGlow = this.activeGlows.find(
      (glow) => glow.x === tile.x && glow.y === tile.y
    );
    if (existingGlow) {
      console.log(
        `-> Glow already exists for [${tile.x},${tile.y}], returning.`
      );
      return; // Don't add another glow if one exists
    }

    console.log(`-> Adding new glow graphics for [${tile.x},${tile.y}]`);
    const glowColor = 0xcd853f;
    const graphics = this.add.graphics({ x: tile.pixelX, y: tile.pixelY });
    graphics.fillStyle(glowColor, 1);
    graphics.fillRect(0, 0, tile.width, tile.height);
    graphics.setAlpha(0);
    graphics.setDepth(this.soilLayer.depth + 0.1);

    this.activeGlows.push({ graphics, x: tile.x, y: tile.y, tween: null });
  }

  private isBaseSoil(tileX: number, tileY: number): boolean {
    const tile = this.soilLayer?.getTileAt(tileX, tileY);
    if (!tile || !tile.tileset) return false;

    const baseIndex = tile.index - tile.tileset.firstgid;
    return baseIndex === this.SOIL_BASE;
  }

  private updateAdjacentSoilBorder(x: number, y: number): void {
    const farmTileset = this.map.getTileset("Farm");
    if (!this.soilLayer || !farmTileset) return;

    if (
      x < 0 ||
      y < 0 ||
      x >= this.soilLayer.width ||
      y >= this.soilLayer.height
    ) {
      return;
    }

    // Don't place borders on base soil tiles or where grass exists
    if (this.isBaseSoil(x, y) || this.grassLayer?.getTileAt(x, y) !== null) {
      return;
    }

    const soilAbove = this.isBaseSoil(x, y - 1);
    const soilBelow = this.isBaseSoil(x, y + 1);
    const soilLeft = this.isBaseSoil(x - 1, y);
    const soilRight = this.isBaseSoil(x + 1, y);

    // Calculate bitmask: 0=N, 1=E, 2=S, 3=W
    let mask = 0;
    if (soilAbove) mask |= 1;
    if (soilRight) mask |= 2;
    if (soilBelow) mask |= 4;
    if (soilLeft) mask |= 8;

    const borderIndexMap: { [key: number]: number | null } = {
      0: null, // No neighbors
      1: this.SOIL_BORDER_DOWN, // N
      2: this.SOIL_BORDER_LEFT, // E
      3: this.SOIL_CORNER_UR, // NE
      4: this.SOIL_BORDER_UP, // S
      5: this.SOIL_UD, // NS
      6: this.SOIL_CORNER_DR, // ES
      7: this.SOIL_UDR, // NES
      8: this.SOIL_BORDER_RIGHT, // W
      9: this.SOIL_CORNER_UL, // NW
      10: this.SOIL_LR, // EW
      11: this.SOIL_LRU, // NEW
      12: this.SOIL_CORNER_DL, // SW
      13: this.SOIL_UDL, // NSW
      14: this.SOIL_LRD, // ESW
      15: this.SOIL_ALL, // NESW
    };

    const borderBaseIndex = borderIndexMap[mask];
    const firstgid = farmTileset.firstgid;
    const currentTile = this.soilLayer.getTileAt(x, y);
    const currentBaseIndex = currentTile
      ? currentTile.index - (currentTile.tileset?.firstgid ?? 0)
      : -1;

    if (borderBaseIndex !== null) {
      const newGlobalIndex = borderBaseIndex + firstgid;

      // Check if the current tile is a pickup item part
      const isPickupItemPart =
        currentTile?.properties?.canPickup1_2 === true ||
        currentTile?.properties?.canPickup2_2 === true;

      // Place or update the border tile if it's not already the correct one
      // AND the current tile is not a pickup item part
      if (
        !isPickupItemPart &&
        (!currentTile || currentTile.index !== newGlobalIndex)
      ) {
        const placed = this.soilLayer.putTileAt(newGlobalIndex, x, y);
        if (placed) {
          // Copy properties from the tileset definition for the border tile
          const borderProps = (farmTileset.tileProperties as any)?.[
            borderBaseIndex
          ];
          placed.properties = borderProps ? { ...borderProps } : {};
        }
      }
    } else {
      // If no border should be here, check if the current tile is a border and remove it
      const isCurrentTileABorder =
        Object.values(borderIndexMap).includes(currentBaseIndex) &&
        currentBaseIndex !== null;

      if (isCurrentTileABorder) {
        this.soilLayer.removeTileAt(x, y);
        // Clean up any associated glow effect if the border is removed
        const glowIndex = this.activeGlows.findIndex(
          (g) => g.x === x && g.y === y
        );
        if (glowIndex > -1) {
          const removedGlow = this.activeGlows.splice(glowIndex, 1)[0];
          removedGlow.tween?.stop();
          removedGlow.graphics.destroy();
          this.updateGlowSequence(); // Re-run the sequence timing if a glow was removed
        }
      }
    }
  }

  private updateGlowSequence(): void {
    console.log("--- updateGlowSequence START ---");
    const glowAlpha = 0.2;
    const glowDuration = 1500;
    const glowSequenceDelayFactor = 50;

    console.log(
      "Existing activeGlows before filter:",
      this.activeGlows.map((g) => `[${g.x},${g.y}]`)
    );

    // Stop all existing tweens first
    this.activeGlows.forEach((item) => {
      item.tween?.stop();
      item.tween = null;
      item.graphics.setAlpha(0); // Ensure graphics are initially hidden
    });

    // Filter glows to only those on actual empty plots
    const glowsToAnimate = this.activeGlows.filter((item) => {
      const soilTile = this.soilLayer?.getTileAt(item.x, item.y);
      const hasEmptyPlot = soilTile?.properties?.emptyPlot === true;
      console.log(
        `Filtering glow [${item.x},${item.y}]: hasEmptyPlot = ${hasEmptyPlot}`
      );
      return soilTile?.properties?.emptyPlot === true;
    });

    console.log(
      "Glows to animate after filter:",
      glowsToAnimate.map((g) => `[${g.x},${g.y}]`)
    );

    // Sort the valid glows for sequential animation
    glowsToAnimate.sort((a, b) => {
      if (a.y !== b.y) {
        return a.y - b.y;
      }
      return a.x - b.x;
    });

    // Start tweens only for the filtered & sorted glows
    glowsToAnimate.forEach((item, index) => {
      item.graphics.setAlpha(0); // Start from alpha 0
      item.tween = this.tweens.add({
        targets: item.graphics,
        alpha: { from: 0, to: glowAlpha },
        duration: glowDuration / 2,
        delay: index * glowSequenceDelayFactor,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    });

    // Optional: Clean up graphics objects in activeGlows that are no longer needed (not in glowsToAnimate)
    // This prevents memory leaks if plots are destroyed/changed in ways not covered by removeGlowEffect
    this.activeGlows = this.activeGlows.filter((item) => {
      const shouldKeep = glowsToAnimate.some(
        (validGlow) => validGlow.graphics === item.graphics
      );
      if (!shouldKeep) {
        item.graphics.destroy(); // Destroy unused graphics objects
      }
      return shouldKeep;
    });

    console.log("--- updateGlowSequence END ---");
  }

  private removeGlowEffect(tileX: number, tileY: number): void {
    const glowIndex = this.activeGlows.findIndex(
      (g) => g.x === tileX && g.y === tileY
    );
    console.log(
      `removeGlowEffect called for tile [${tileX},${tileY}]. Found index: ${glowIndex}`
    );

    if (glowIndex > -1) {
      const removedGlow = this.activeGlows.splice(glowIndex, 1)[0];
      console.log(`-> Removing glow object for [${tileX},${tileY}]`);
      removedGlow.tween?.stop();
      removedGlow.graphics.destroy();
      this.updateGlowSequence(); // Update sequence timing after removal
    }
  }

  private getCropInfoFromIndex(baseIndex: number): {
    seedId: string | null;
    stage: number | null;
  } {
    for (const seedId in this.SEED_STAGE1_INDICES) {
      const stage1Index = this.SEED_STAGE1_INDICES[seedId];
      if (
        baseIndex >= stage1Index &&
        baseIndex < stage1Index + this.CROP_STAGES
      ) {
        const stage = baseIndex - stage1Index + 1;
        return { seedId, stage };
      }
    }
    return { seedId: null, stage: null }; // Not found
  }

  // ++ NEW HELPER FUNCTION ++
  private calculateSoilBorderIndex(
    x: number,
    y: number,
    hypotheticalSoilX?: number, // Optional: X coord of a tile to *treat* as base soil
    hypotheticalSoilY?: number // Optional: Y coord of a tile to *treat* as base soil
  ): number | null {
    const farmTileset = this.map.getTileset("Farm");
    if (!this.soilLayer || !farmTileset) return null;

    if (
      x < 0 ||
      y < 0 ||
      x >= this.soilLayer.width ||
      y >= this.soilLayer.height
    ) {
      return null;
    }

    // Helper to check for base soil, considering the hypothetical placement
    const checkIsBaseSoil = (checkX: number, checkY: number): boolean => {
      if (checkX === hypotheticalSoilX && checkY === hypotheticalSoilY) {
        return true; // Treat the hypothetical position as base soil
      }
      return this.isBaseSoil(checkX, checkY); // Otherwise, check the actual tile
    };

    // Borders are not placed on base soil tiles or where grass exists
    if (checkIsBaseSoil(x, y) || this.grassLayer?.getTileAt(x, y) !== null) {
      return null;
    }

    const soilAbove = checkIsBaseSoil(x, y - 1);
    const soilBelow = checkIsBaseSoil(x, y + 1);
    const soilLeft = checkIsBaseSoil(x - 1, y);
    const soilRight = checkIsBaseSoil(x + 1, y);

    let mask = 0;
    if (soilAbove) mask |= 1; // N
    if (soilRight) mask |= 2; // E
    if (soilBelow) mask |= 4; // S
    if (soilLeft) mask |= 8; // W

    const borderIndexMap: { [key: number]: number | null } = {
      0: null, // No neighbors
      1: this.SOIL_BORDER_DOWN, // N
      2: this.SOIL_BORDER_LEFT, // E
      3: this.SOIL_CORNER_UR, // NE
      4: this.SOIL_BORDER_UP, // S
      5: this.SOIL_UD, // NS
      6: this.SOIL_CORNER_DR, // ES
      7: this.SOIL_UDR, // NES
      8: this.SOIL_BORDER_RIGHT, // W
      9: this.SOIL_CORNER_UL, // NW
      10: this.SOIL_LR, // EW
      11: this.SOIL_LRU, // NEW
      12: this.SOIL_CORNER_DL, // SW
      13: this.SOIL_UDL, // NSW
      14: this.SOIL_LRD, // ESW
      15: this.SOIL_ALL, // NESW
    };

    return borderIndexMap[mask]; // Return the base index or null
  }
  // -- END NEW HELPER FUNCTION --

  // ++ NEW FUNCTION: Check for conflicts before placing soil ++
  private checkSoilPlacementConflict(
    targetX: number,
    targetY: number
  ): boolean {
    if (!this.soilLayer) return false; // Should not happen if canPlaceSoil passed

    const neighbors = [
      { x: targetX, y: targetY - 1 }, // Above
      { x: targetX, y: targetY + 1 }, // Below
      { x: targetX - 1, y: targetY }, // Left
      { x: targetX + 1, y: targetY }, // Right
    ];

    for (const neighbor of neighbors) {
      const neighborTile = this.soilLayer.getTileAt(neighbor.x, neighbor.y);
      const isPickupItemPart =
        neighborTile?.properties?.canPickup1_2 === true ||
        neighborTile?.properties?.canPickup2_2 === true;

      if (isPickupItemPart) {
        // Check if placing soil at targetX, targetY would cause a border
        // to be placed on this pickup item neighbor.
        const wouldPlaceBorderIndex = this.calculateSoilBorderIndex(
          neighbor.x,
          neighbor.y,
          targetX, // Pass the hypothetical soil location
          targetY
        );

        if (wouldPlaceBorderIndex !== null) {
          console.warn(
            `Soil placement at [${targetX}, ${targetY}] prevented. Would overwrite pickup item part at [${neighbor.x}, ${neighbor.y}] with a border.`
          );
          return true; // Conflict found
        }
      }
    }

    return false; // No conflicts found
  }
  // -- END NEW FUNCTION --

  // Add cleanup for sounds if the scene is destroyed (good practice)
  shutdown() {
    this.sound.stopAll(); // Stop all sounds associated with this scene
  }
}
