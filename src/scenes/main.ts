import "phaser";

export default class MainScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private playerSpeed: number = 150;
  private currentAnimation: string = 'idle-down';

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

    this.load.spritesheet('idle-down', 
      'Pixel Crawler - Free Pack/Entities/Characters/Body_A/Animations/Idle_Base/Idle_Down-Sheet.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet('idle-up', 
      'Pixel Crawler - Free Pack/Entities/Characters/Body_A/Animations/Idle_Base/Idle_Up-Sheet.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet('idle-side', 
      'Pixel Crawler - Free Pack/Entities/Characters/Body_A/Animations/Idle_Base/Idle_Side-Sheet.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet('run-down', 
      'Pixel Crawler - Free Pack/Entities/Characters/Body_A/Animations/Run_Base/Run_Down-Sheet.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet('run-up', 
      'Pixel Crawler - Free Pack/Entities/Characters/Body_A/Animations/Run_Base/Run_Up-Sheet.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet('run-side', 
      'Pixel Crawler - Free Pack/Entities/Characters/Body_A/Animations/Run_Base/Run_Side-Sheet.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet('walk-down', 
      'Pixel Crawler - Free Pack/Entities/Characters/Body_A/Animations/Walk_Base/Walk_Down-Sheet.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet('walk-up', 
      'Pixel Crawler - Free Pack/Entities/Characters/Body_A/Animations/Walk_Base/Walk_Up-Sheet.png',
      { frameWidth: 16, frameHeight: 16 }
    );
    this.load.spritesheet('walk-side', 
      'Pixel Crawler - Free Pack/Entities/Characters/Body_A/Animations/Walk_Base/Walk_Side-Sheet.png',
      { frameWidth: 16, frameHeight: 16 }
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

    // Create character animations
    this.createAnimations();

    // Create player sprite
    this.player = this.physics.add.sprite(
      this.map.widthInPixels / 2,
      this.map.heightInPixels / 2,
      'idle-down'
    );
    this.player.setCollideWorldBounds(true);
    this.player.setSize(10, 10); // Adjust hitbox size
    this.player.setOffset(3, 6); // Adjust hitbox position

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(3); // Adjust zoom for better viewing

    // Add debug information
    console.log(`Map dimensions: ${this.map.width}x${this.map.height}`);
    console.log(`Total layers: ${this.map.layers.length}`);
    console.log(
      `Created layers: ${layersCreated.length}/${this.map.layers.length}`
    );
    console.log(
      `Loaded tilesets: ${tilesets.length}/${this.map.tilesets.length}`
    );
    console.log("Use arrow keys or WASD to move the character");
  }

  createAnimations() {
    this.anims.create({
      key: 'idle-down',
      frames: this.anims.generateFrameNumbers('idle-down', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });
    this.anims.create({
      key: 'idle-up',
      frames: this.anims.generateFrameNumbers('idle-up', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });
    this.anims.create({
      key: 'idle-side',
      frames: this.anims.generateFrameNumbers('idle-side', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });
    
    this.anims.create({
      key: 'run-down',
      frames: this.anims.generateFrameNumbers('run-down', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'run-up',
      frames: this.anims.generateFrameNumbers('run-up', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'run-side',
      frames: this.anims.generateFrameNumbers('run-side', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('walk-down', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('walk-up', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'walk-side',
      frames: this.anims.generateFrameNumbers('walk-side', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });
  }

  update(_: number, _delta: number) {
    if (!this.player) return;

    this.player.setVelocity(0);

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    const shift = this.cursors.shift.isDown;

    const speed = shift ? this.playerSpeed * 1.5 : this.playerSpeed;
    const moveType = shift ? 'run' : 'walk';

    if (left) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
      this.player.anims.play(`${moveType}-side`, true);
      this.currentAnimation = `${moveType}-side`;
    } else if (right) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
      this.player.anims.play(`${moveType}-side`, true);
      this.currentAnimation = `${moveType}-side`;
    }

    if (up) {
      this.player.setVelocityY(-speed);
      if (!left && !right) {
        this.player.anims.play(`${moveType}-up`, true);
        this.currentAnimation = `${moveType}-up`;
      }
    } else if (down) {
      this.player.setVelocityY(speed);
      if (!left && !right) {
        this.player.anims.play(`${moveType}-down`, true);
        this.currentAnimation = `${moveType}-down`;
      }
    }

    if (!left && !right && !up && !down) {
      if (this.currentAnimation.includes('side')) {
        this.player.anims.play('idle-side', true);
      } else if (this.currentAnimation.includes('up')) {
        this.player.anims.play('idle-up', true);
      } else {
        this.player.anims.play('idle-down', true);
      }
    }
  }
}
