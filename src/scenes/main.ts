import "phaser";

export default class MainScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;
  private controls!: Phaser.Cameras.Controls.SmoothedKeyControl;
  private player!: Phaser.GameObjects.Sprite;
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SHIFT: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    C: Phaser.Input.Keyboard.Key; // Carry Toggle
    E: Phaser.Input.Keyboard.Key; // Collect
    R: Phaser.Input.Keyboard.Key; // Crush
    F: Phaser.Input.Keyboard.Key; // Pierce
    Q: Phaser.Input.Keyboard.Key; // Slice
    G: Phaser.Input.Keyboard.Key; // Watering
  };
  private currentDir: string = "down";
  private isCarrying: boolean = false; // Add carry state

  // Movement speeds
  private walkSpeed = 100; // Pixels per second
  private runSpeed = 200; // Pixels per second

  constructor() {
    super("main");
  }

  preload() {
    // Load the tilemap
    this.load.tilemapTiledJSON("map", "map.tmj");

    // Load all tileset images directly with the exact paths from the map file
    this.load.image(
      "Dungeon_Tiles",
      "Pixel Crawler - Free Pack/Environment/Tilesets/Dungeon_Tiles.png"
    );
    this.load.image(
      "Floors_Tiles",
      "Pixel Crawler - Free Pack/Environment/Tilesets/Floors_Tiles.png"
    );
    this.load.image(
      "Wall_Tiles",
      "Pixel Crawler - Free Pack/Environment/Tilesets/Wall_Tiles.png"
    );
    this.load.image(
      "Wall_Variations",
      "Pixel Crawler - Free Pack/Environment/Tilesets/Wall_Variations.png"
    );
    this.load.image(
      "Water_tiles",
      "Pixel Crawler - Free Pack/Environment/Tilesets/Water_tiles.png"
    );
    // Additional tilesets found in the map
    this.load.image(
      "Vegetation",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Vegetation.png"
    );
    this.load.image(
      "Props",
      "Pixel Crawler - Free Pack/Environment/Structures/Buildings/Props.png"
    );
    this.load.image(
      "Roofs",
      "Pixel Crawler - Free Pack/Environment/Structures/Buildings/Roofs.png"
    );
    this.load.image(
      "Walls",
      "Pixel Crawler - Free Pack/Environment/Structures/Buildings/Walls.png"
    );
    this.load.image(
      "Size_02",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Trees/Model_01/Size_02.png"
    );
    this.load.image(
      "Size_03",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Trees/Model_01/Size_03.png"
    );
    this.load.image(
      "Size_04",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Trees/Model_01/Size_04.png"
    );
    this.load.image(
      "Size_05",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Trees/Model_01/Size_05.png"
    );
    this.load.image(
      "Furniture",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Furniture.png"
    );
    this.load.image(
      "Rocks",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Rocks.png"
    );
    this.load.image(
      "Farm",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Farm.png"
    );
    // Add the missing Shadows tileset
    this.load.image(
      "Shadows",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Shadows.png"
    );

    // --- Add missing map tilesets ---
    this.load.image(
      "Shadows1",
      "Pixel Crawler - Free Pack/Environment/Structures/Buildings/Shadows1.png"
    );
    this.load.image(
      "Level_1",
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/Level_1.png"
    );
    this.load.spritesheet(
      "Level_2-Sheet",
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/Level_2-Sheet.png",
      { frameWidth: 80, frameHeight: 64 } // From map.tmj
    );
    this.load.spritesheet(
      "Level_3-Sheet",
      "Pixel Crawler - Free Pack/Environment/Structures/Stations/Sawmill/Level_3-Sheet.png",
      { frameWidth: 112, frameHeight: 80 } // From map.tmj
    );
    // --- End of missing map tilesets ---

    // Load Player Animation Spritesheets (assuming fixed frame size for now)
    // We'll need to adjust frameWidth/frameHeight if they differ
    const frameConfig = { frameWidth: 64, frameHeight: 64 }; // Corrected size

    // Idle
    this.load.spritesheet(
      "idle_down",
      "Animations/Idle_Base/Idle_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "idle_up",
      "Animations/Idle_Base/Idle_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "idle_side",
      "Animations/Idle_Base/Idle_Side-Sheet.png",
      frameConfig
    );

    // Walk
    this.load.spritesheet(
      "walk_down",
      "Animations/Walk_Base/Walk_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "walk_up",
      "Animations/Walk_Base/Walk_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "walk_side",
      "Animations/Walk_Base/Walk_Side-Sheet.png",
      frameConfig
    );

    // Run
    this.load.spritesheet(
      "run_down",
      "Animations/Run_Base/Run_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "run_up",
      "Animations/Run_Base/Run_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "run_side",
      "Animations/Run_Base/Run_Side-Sheet.png",
      frameConfig
    );

    // Hit
    this.load.spritesheet(
      "hit_down",
      "Animations/Hit_Base/Hit_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "hit_up",
      "Animations/Hit_Base/Hit_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "hit_side",
      "Animations/Hit_Base/Hit_Side-Sheet.png",
      frameConfig
    );

    // --- Load New Animations ---

    // Carry Idle (4 frames)
    this.load.spritesheet(
      "carry_idle_down",
      "Animations/Carry_Idle/Carry_Idle_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_idle_up",
      "Animations/Carry_Idle/Carry_Idle_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_idle_side",
      "Animations/Carry_Idle/Carry_Idle_Side-Sheet.png",
      frameConfig
    );

    // Carry Walk (6 frames)
    this.load.spritesheet(
      "carry_walk_down",
      "Animations/Carry_Walk/Carry_Walk_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_walk_up",
      "Animations/Carry_Walk/Carry_Walk_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_walk_side",
      "Animations/Carry_Walk/Carry_Walk_Side-Sheet.png",
      frameConfig
    );

    // Carry Run (6 frames)
    this.load.spritesheet(
      "carry_run_down",
      "Animations/Carry_Run/Carry_Run_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_run_up",
      "Animations/Carry_Run/Carry_Run_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "carry_run_side",
      "Animations/Carry_Run/Carry_Run_Side-Sheet.png",
      frameConfig
    );

    // Collect (8 frames)
    this.load.spritesheet(
      "collect_down",
      "Animations/Collect_Base/Collect_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "collect_up",
      "Animations/Collect_Base/Collect_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "collect_side",
      "Animations/Collect_Base/Collect_Side-Sheet.png",
      frameConfig
    );

    // Crush (8 frames)
    this.load.spritesheet(
      "crush_down",
      "Animations/Crush_Base/Crush_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "crush_up",
      "Animations/Crush_Base/Crush_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "crush_side",
      "Animations/Crush_Base/Crush_Side-Sheet.png",
      frameConfig
    );

    // Pierce (8 frames)
    this.load.spritesheet(
      "pierce_down",
      "Animations/Pierce_Base/Pierce_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "pierce_up",
      "Animations/Pierce_Base/Pierce_Top-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "pierce_side",
      "Animations/Pierce_Base/Pierce_Side-Sheet.png",
      frameConfig
    );

    // Slice (8 frames)
    this.load.spritesheet(
      "slice_down",
      "Animations/Slice_Base/Slice_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "slice_up",
      "Animations/Slice_Base/Slice_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "slice_side",
      "Animations/Slice_Base/Slice_Side-Sheet.png",
      frameConfig
    );

    // Watering (8 frames)
    this.load.spritesheet(
      "watering_down",
      "Animations/Watering_Base/Watering_Down-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "watering_up",
      "Animations/Watering_Base/Watering_Up-Sheet.png",
      frameConfig
    );
    this.load.spritesheet(
      "watering_side",
      "Animations/Watering_Base/Watering_Side-Sheet.png",
      frameConfig
    );
  }

  create() {
    // Create the tilemap
    this.map = this.make.tilemap({ key: "map" });

    // Automatically load all tilesets defined in the map
    const tilesets: Phaser.Tilemaps.Tileset[] = [];

    // Get all tileset names from the map
    const mapTilesets = this.map.tilesets;
    console.log(
      "Map contains these tilesets:",
      mapTilesets.map((ts) => ts.name)
    );

    // Add each tileset
    for (const mapTileset of mapTilesets) {
      const tileset = this.map.addTilesetImage(
        mapTileset.name,
        mapTileset.name
      );
      if (tileset) {
        tilesets.push(tileset);
        console.log(`Successfully loaded tileset: ${mapTileset.name}`);
      } else {
        console.error(`Failed to load tileset: ${mapTileset.name}`);
      }
    }

    // Check if we have any tilesets loaded
    if (tilesets.length === 0) {
      console.error(
        "No tilesets were loaded successfully. Cannot create map layers."
      );
      return;
    }

    // Create all map layers
    const layersCreated: string[] = [];

    for (const layer of this.map.layers) {
      try {
        const createdLayer = this.map.createLayer(layer.name, tilesets, 0, 0);
        if (createdLayer) {
          layersCreated.push(layer.name);
          console.log(`Successfully created layer: ${layer.name}`);

          // Set each layer's visible property according to the map data
          if (layer.visible === false) {
            createdLayer.setVisible(false);
            console.log(
              `Layer ${layer.name} set to invisible as defined in map`
            );
          }
        } else {
          console.error(`Failed to create layer: ${layer.name}`);
        }
      } catch (error) {
        console.error(`Error creating layer ${layer.name}:`, error);
      }
    }

    // --- Player Setup ---
    // Spawn Player
    this.player = this.add.sprite(100, 100, "idle_down"); // Start position and initial sprite
    this.player.setOrigin(0.5, 0.5);
    // this.player.setScale(2); // Optional: Adjust scale if needed

    // Player Animations
    const anims = this.anims;
    const frameRate = 10; // Adjust frame rate as needed
    const repeat = -1; // Loop infinitely

    // Idle (4 frames)
    anims.create({
      key: "idle_down",
      frames: anims.generateFrameNumbers("idle_down", { end: 3 }), // Specify frame count
      frameRate: frameRate / 2,
      repeat: repeat,
    });
    anims.create({
      key: "idle_up",
      frames: anims.generateFrameNumbers("idle_up", { end: 3 }), // Specify frame count
      frameRate: frameRate / 2,
      repeat: repeat,
    });
    anims.create({
      key: "idle_side",
      frames: anims.generateFrameNumbers("idle_side", { end: 3 }), // Specify frame count
      frameRate: frameRate / 2,
      repeat: repeat,
    });

    // Walk (6 frames)
    anims.create({
      key: "walk_down",
      frames: anims.generateFrameNumbers("walk_down", { end: 5 }), // Specify frame count
      frameRate: frameRate,
      repeat: repeat,
    });
    anims.create({
      key: "walk_up",
      frames: anims.generateFrameNumbers("walk_up", { end: 5 }), // Specify frame count
      frameRate: frameRate,
      repeat: repeat,
    });
    anims.create({
      key: "walk_side",
      frames: anims.generateFrameNumbers("walk_side", { end: 5 }), // Specify frame count
      frameRate: frameRate,
      repeat: repeat,
    });

    // Run (6 frames)
    anims.create({
      key: "run_down",
      frames: anims.generateFrameNumbers("run_down", { end: 5 }), // Specify frame count
      frameRate: frameRate * 1.5,
      repeat: repeat,
    });
    anims.create({
      key: "run_up",
      frames: anims.generateFrameNumbers("run_up", { end: 5 }), // Specify frame count
      frameRate: frameRate * 1.5,
      repeat: repeat,
    });
    anims.create({
      key: "run_side",
      frames: anims.generateFrameNumbers("run_side", { end: 5 }), // Specify frame count
      frameRate: frameRate * 1.5,
      repeat: repeat,
    });

    // Hit (4 frames, no repeat)
    anims.create({
      key: "hit_down",
      frames: anims.generateFrameNumbers("hit_down", { end: 3 }), // Specify frame count
      frameRate: frameRate * 1.2,
      repeat: 0,
    });
    anims.create({
      key: "hit_up",
      frames: anims.generateFrameNumbers("hit_up", { end: 3 }), // Specify frame count
      frameRate: frameRate * 1.2,
      repeat: 0,
    });
    anims.create({
      key: "hit_side",
      frames: anims.generateFrameNumbers("hit_side", { end: 3 }), // Specify frame count
      frameRate: frameRate * 1.2,
      repeat: 0,
    });

    // --- Create New Animations ---
    const actionFrameRate = frameRate * 1.2; // Frame rate for non-looping actions

    // Carry Idle (4 frames, loop)
    anims.create({
      key: "carry_idle_down",
      frames: anims.generateFrameNumbers("carry_idle_down", { end: 3 }),
      frameRate: frameRate / 2,
      repeat: -1,
    });
    anims.create({
      key: "carry_idle_up",
      frames: anims.generateFrameNumbers("carry_idle_up", { end: 3 }),
      frameRate: frameRate / 2,
      repeat: -1,
    });
    anims.create({
      key: "carry_idle_side",
      frames: anims.generateFrameNumbers("carry_idle_side", { end: 3 }),
      frameRate: frameRate / 2,
      repeat: -1,
    });

    // Carry Walk (6 frames, loop)
    anims.create({
      key: "carry_walk_down",
      frames: anims.generateFrameNumbers("carry_walk_down", { end: 5 }),
      frameRate: frameRate,
      repeat: -1,
    });
    anims.create({
      key: "carry_walk_up",
      frames: anims.generateFrameNumbers("carry_walk_up", { end: 5 }),
      frameRate: frameRate,
      repeat: -1,
    });
    anims.create({
      key: "carry_walk_side",
      frames: anims.generateFrameNumbers("carry_walk_side", { end: 5 }),
      frameRate: frameRate,
      repeat: -1,
    });

    // Carry Run (6 frames, loop)
    anims.create({
      key: "carry_run_down",
      frames: anims.generateFrameNumbers("carry_run_down", { end: 5 }),
      frameRate: frameRate * 1.5,
      repeat: -1,
    });
    anims.create({
      key: "carry_run_up",
      frames: anims.generateFrameNumbers("carry_run_up", { end: 5 }),
      frameRate: frameRate * 1.5,
      repeat: -1,
    });
    anims.create({
      key: "carry_run_side",
      frames: anims.generateFrameNumbers("carry_run_side", { end: 5 }),
      frameRate: frameRate * 1.5,
      repeat: -1,
    });

    // Collect (8 frames, no repeat)
    anims.create({
      key: "collect_down",
      frames: anims.generateFrameNumbers("collect_down", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "collect_up",
      frames: anims.generateFrameNumbers("collect_up", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "collect_side",
      frames: anims.generateFrameNumbers("collect_side", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });

    // Crush (8 frames, no repeat)
    anims.create({
      key: "crush_down",
      frames: anims.generateFrameNumbers("crush_down", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "crush_up",
      frames: anims.generateFrameNumbers("crush_up", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "crush_side",
      frames: anims.generateFrameNumbers("crush_side", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });

    // Pierce (8 frames, no repeat)
    anims.create({
      key: "pierce_down",
      frames: anims.generateFrameNumbers("pierce_down", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "pierce_up",
      frames: anims.generateFrameNumbers("pierce_up", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "pierce_side",
      frames: anims.generateFrameNumbers("pierce_side", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });

    // Slice (8 frames, no repeat)
    anims.create({
      key: "slice_down",
      frames: anims.generateFrameNumbers("slice_down", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "slice_up",
      frames: anims.generateFrameNumbers("slice_up", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "slice_side",
      frames: anims.generateFrameNumbers("slice_side", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });

    // Watering (8 frames, no repeat)
    anims.create({
      key: "watering_down",
      frames: anims.generateFrameNumbers("watering_down", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "watering_up",
      frames: anims.generateFrameNumbers("watering_up", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });
    anims.create({
      key: "watering_side",
      frames: anims.generateFrameNumbers("watering_side", { end: 7 }),
      frameRate: actionFrameRate,
      repeat: 0,
    });

    // --- Input Setup ---
    // Use WASD instead of arrow keys for camera control
    const cursors = this.input.keyboard?.createCursorKeys(); // Still needed for camera controls
    const controlConfig = {
      camera: this.cameras.main,
      left: cursors?.left, // Camera still uses arrows
      right: cursors?.right,
      up: cursors?.up,
      down: cursors?.down,
      acceleration: 0.06,
      drag: 0.0005,
      maxSpeed: 1.0,
    };

    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.setZoom(3); // Adjust zoom for better viewing

    // Add camera controls
    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(
      controlConfig
    );

    // Setup player controls
    this.keys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SHIFT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      SPACE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      C: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      E: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      R: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      F: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      Q: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      G: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.G),
    };

    // Play initial animation
    this.player.anims.play("idle_down", true);

    // Add debug information
    console.log(`Map dimensions: ${this.map.width}x${this.map.height}`);
    console.log(`Total layers: ${this.map.layers.length}`);
    console.log(
      `Created layers: ${layersCreated.length}/${this.map.layers.length}`
    );
    console.log(
      `Loaded tilesets: ${tilesets.length}/${this.map.tilesets.length}`
    );
    console.log("Use arrow keys to navigate the map");
    console.log("Use WASD to move, Shift to run, Space to hit");
    console.log(
      "C: Toggle Carry, E: Collect, R: Crush, F: Pierce, Q: Slice, G: Watering"
    ); // Add new controls info
  }

  update(_: number, delta: number) {
    // Update camera controls
    if (this.controls) {
      this.controls.update(delta);
    }

    // Player Animation & Movement Logic
    const walkSpeed = this.walkSpeed;
    const runSpeed = this.runSpeed;
    const speed = Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)
      ? runSpeed
      : walkSpeed;
    let dx = 0;
    let dy = 0;

    const isMovingW = this.keys.W.isDown;
    const isMovingA = this.keys.A.isDown;
    const isMovingS = this.keys.S.isDown;
    const isMovingD = this.keys.D.isDown;
    const isRunning = this.keys.SHIFT.isDown; // Changed from JustDown to isDown
    const isHitting = Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    const justPressedCarry = Phaser.Input.Keyboard.JustDown(this.keys.C);
    const isCollecting = Phaser.Input.Keyboard.JustDown(this.keys.E);
    const isCrushing = Phaser.Input.Keyboard.JustDown(this.keys.R);
    const isPiercing = Phaser.Input.Keyboard.JustDown(this.keys.F);
    const isSlicing = Phaser.Input.Keyboard.JustDown(this.keys.Q);
    const isWatering = Phaser.Input.Keyboard.JustDown(this.keys.G);

    let currentAnim = this.player.anims.currentAnim?.key || "";
    let isPlayingAction =
      this.player.anims.isPlaying &&
      (currentAnim.startsWith("hit_") ||
        currentAnim.startsWith("collect_") ||
        currentAnim.startsWith("crush_") ||
        currentAnim.startsWith("pierce_") ||
        currentAnim.startsWith("slice_") ||
        currentAnim.startsWith("watering_"));
    let newAnim = "";
    let flipX = this.player.flipX; // Start with current flip state

    let moveX = 0;
    let moveY = 0;

    // Handle Carry Toggle first if no action is playing
    if (justPressedCarry && !isPlayingAction) {
      this.isCarrying = !this.isCarrying;
    }

    // --- Determine Animation based on Input and State ---

    // Priority 1: Action Animations (if not already playing one)
    if (!isPlayingAction) {
      let actionKeyBase = "";
      if (isHitting) actionKeyBase = "hit";
      else if (isCollecting) actionKeyBase = "collect";
      else if (isCrushing) actionKeyBase = "crush";
      else if (isPiercing) actionKeyBase = "pierce";
      else if (isSlicing) actionKeyBase = "slice";
      else if (isWatering) actionKeyBase = "watering";

      if (actionKeyBase) {
        // Map direction to animation key suffix (_up, _down, _side)
        const directionSuffix =
          this.currentDir === "up" || this.currentDir === "down"
            ? this.currentDir
            : "side";
        newAnim = `${actionKeyBase}_${directionSuffix}`;
        flipX = this.currentDir === "left"; // Set flip based on actual direction
      }
    }

    // Priority 2: Movement/Idle (only if no new action animation was triggered)
    if (!newAnim && !isPlayingAction) {
      const basePrefix = this.isCarrying ? "carry_" : "";
      const movePrefix = isRunning ? `${basePrefix}run_` : `${basePrefix}walk_`;
      const idlePrefix = `${basePrefix}idle_`;

      if (isMovingW || isMovingA || isMovingS || isMovingD) {
        // Determine direction and movement speed
        const currentSpeed = isRunning ? runSpeed : walkSpeed;

        if (isMovingW) {
          this.currentDir = "up";
          newAnim = `${movePrefix}up`;
          moveY = -currentSpeed;
        } else if (isMovingS) {
          this.currentDir = "down";
          newAnim = `${movePrefix}down`;
          moveY = currentSpeed;
        }

        if (isMovingA) {
          this.currentDir = "left";
          newAnim = `${movePrefix}side`;
          flipX = true;
          moveX = -currentSpeed;
          if (isMovingW || isMovingS) moveY = 0; // Prioritize horizontal animation on diagonal
        } else if (isMovingD) {
          this.currentDir = "right";
          newAnim = `${movePrefix}side`;
          flipX = false;
          moveX = currentSpeed;
          if (isMovingW || isMovingS) moveY = 0; // Prioritize horizontal animation on diagonal
        }
      } else {
        // Not moving, play idle animation for the current direction and carry state
        const idlePrefix = this.isCarrying ? "carry_idle_" : "idle_";
        // Map direction to animation key suffix (_up, _down, _side)
        const directionSuffix =
          this.currentDir === "up" || this.currentDir === "down"
            ? this.currentDir
            : "side";
        newAnim = `${idlePrefix}${directionSuffix}`;
        flipX = this.currentDir === "left";
      }
    }

    // Set flip before potentially playing animation
    this.player.setFlipX(flipX);

    // Play animation if it's different from the current one or an action just started
    if (newAnim && (newAnim !== currentAnim || !this.player.anims.isPlaying)) {
      this.player.anims.play(newAnim, true);
      // Update isPlayingAction flag if a new action animation just started
      isPlayingAction =
        newAnim.startsWith("hit_") ||
        newAnim.startsWith("collect_") ||
        newAnim.startsWith("crush_") ||
        newAnim.startsWith("pierce_") ||
        newAnim.startsWith("slice_") ||
        newAnim.startsWith("watering_");
    }

    // Apply movement based on calculated velocity and delta time, ONLY if not playing an action
    if (!isPlayingAction) {
      // Normalize diagonal movement
      const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
      if (magnitude > 0) {
        const speedToUse = isRunning ? runSpeed : walkSpeed;
        moveX = (moveX / magnitude) * speedToUse;
        moveY = (moveY / magnitude) * speedToUse;
      }

      // Check for bottomCollision before applying movement
      const newX = this.player.x + moveX * (delta / 1000);
      const newY = this.player.y + moveY * (delta / 1000);
      const tileSize = this.map.tileWidth; // Assuming square tiles

      // Check if the player is trying to move through a bottomCollision tile
      if (this.hasBottomCollision(newX, newY, tileSize)) {
        // Prevent movement through the bottom edge
        if (moveY > 0) {
          // Moving down
          const tileY = Math.floor(newY / tileSize) * tileSize;
          if (newY > tileY) {
            moveY = 0;
          }
        } else if (moveY < 0) {
          // Moving up
          const tileY = Math.floor(newY / tileSize) * tileSize;
          if (newY < tileY + tileSize) {
            moveY = 0;
          }
        }
      }

      this.player.x += moveX * (delta / 1000);
      this.player.y += moveY * (delta / 1000);
    }
  }

  // Add a method to check for bottomCollision property in all layers
  private hasBottomCollision(x: number, y: number, tileSize: number): boolean {
    const tileX = Math.floor(x / tileSize);
    const tileY = Math.floor(y / tileSize);

    // Iterate through all layers of the map
    for (const layer of this.map.layers) {
      const tile = layer.tilemapLayer.getTileAt(tileX, tileY);
      if (tile && tile.properties && tile.properties.bottomCollision) {
        return true;
      }
    }
    return false;
  }
}
