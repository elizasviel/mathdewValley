import "phaser";

// Define the structure for our selectable items
interface SelectableItem {
  id: string;
  name: string;
  frameIndex: number; // Frame index from the Farm spritesheet
}

// Define the character set for the retro fonts - Escaped single quotes
const FONT_CHARS =
  '  1234567890AaBbCcDdEeFfGgHhIiJjKkLlMmNnñÑOoPpQqRrSsTtUuVvWwXxYyZz¡!¿?@/$&~Çç\\‘\\\'"".,;:/\\[]()}{-_=+\\*^%°X✓'; // Note: Escaped single quotes

export default class UIScene extends Phaser.Scene {
  private items: SelectableItem[] = [
    { id: "carrot", name: "Carrot", frameIndex: 26 },
    { id: "radish", name: "Radish", frameIndex: 76 },
    { id: "cabbage", name: "Cabbage", frameIndex: 126 },
    { id: "lettuce", name: "Lettuce", frameIndex: 176 },
    { id: "cauliflower", name: "Cauliflower", frameIndex: 226 },
    { id: "broccoli", name: "Broccoli", frameIndex: 276 },
    { id: "garlic", name: "Garlic", frameIndex: 326 },
    { id: "fertilizer", name: "Fertilizer", frameIndex: 42 },
  ];
  private selectedItemId: string = "carrot"; // State for the selected item
  private gridButtons: Phaser.GameObjects.Image[] = []; // Store button references
  private sfxButtonPress!: Phaser.Sound.BaseSound; // Sound effect for button press

  constructor() {
    super({ key: "UIScene", active: false });
  }

  preload() {
    // Load UI assets needed specifically for this scene
    this.load.image("ui_wood_flat", "UI_Wood_Flat.png");
    // Load the Farm spritesheet for icons
    this.load.spritesheet(
      "Farm",
      "Pixel Crawler - Free Pack/Environment/Props/Static/Farm.png",
      { frameWidth: 16, frameHeight: 16 }
    );
    // Load the button press sound effect
    this.load.audio("buttonpress", "Sounds/buttonpress.mp3"); // Added sound load

    // Load the retro font images
    this.load.image("font_a", "NoShadow/UI_Font_A.png");
    this.load.image("font_b", "NoShadow/UI_Font_B.png");

    this.load.once("filecomplete-image-ui_wood_flat", () => {});
    this.load.once("loaderror-image-ui_wood_flat", (file: any) => {
      console.error("UIScene error loading ui_wood_flat.png:", file);
    });
  }

  create() {
    // --- Parse Retro Fonts ---
    const fontAConfig /* : Phaser.Types.GameObjects.BitmapText.RetroFontConfig */ =
      {
        // Temporarily removing explicit type
        image: "font_a",
        width: 32,
        height: 32,
        chars: FONT_CHARS,
        charsPerRow: 18, // 576 / 16 = 36? No, 576/32 = 18. Using user's value.
        // Let's stick with the nested structure based on docs for now
        offset: { x: 0, y: 0 },
        spacing: { x: 0, y: 0 },
        lineSpacing: 0,
      };
    this.cache.bitmapFont.add(
      "font_a",
      // Casting to 'any' to bypass type checking temporarily
      Phaser.GameObjects.RetroFont.Parse(this, fontAConfig as any)
    );

    const fontBConfig /* : Phaser.Types.GameObjects.BitmapText.RetroFontConfig */ =
      {
        // Temporarily removing explicit type
        image: "font_b",
        width: 32,
        height: 32,
        chars: FONT_CHARS,
        charsPerRow: 18, // 576 / 16 = 36? No, 576/32 = 18. Using user's value.
        // Let's stick with the nested structure based on docs for now
        offset: { x: 0, y: 0 },
        spacing: { x: 0, y: 0 },
        lineSpacing: 0,
      };
    this.cache.bitmapFont.add(
      "font_b",
      // Casting to 'any' to bypass type checking temporarily
      Phaser.GameObjects.RetroFont.Parse(this, fontBConfig as any)
    );
    // --- End Font Parsing ---

    // Get screen dimensions
    const { width: screenWidth, height: screenHeight } = this.scale;

    // Initialize the sound effect
    this.sfxButtonPress = this.sound.add("buttonpress"); // Added sound initialization

    // Define margin from screen edges
    const margin = 0;

    // Calculate position for bottom-right corner
    const panelX = screenWidth - margin;
    const panelY = screenHeight - margin;

    const uiPanel = this.add.image(panelX, panelY, "ui_wood_flat");

    uiPanel.setCrop(0, 225, 160, 160);

    // Set origin to bottom-right for positioning
    uiPanel.setOrigin(0.71, 1);

    // Make the panel larger
    uiPanel.setScale(2, 3);

    // Define button properties
    const buttonTexture = "ui_wood_flat";
    const buttonCropRect = { x: 161, y: 193, width: 48, height: 48 };
    const buttonScale = 2.5;
    const buttonOrigin = { x: 0.5, y: 0.5 };
    const hitAreaRect = new Phaser.Geom.Rectangle(164, 195, 40, 40); // Use the same hit area definition for consistency
    const hitAreaCallback = Phaser.Geom.Rectangle.Contains;
    this.gridButtons = []; // Clear previous buttons if scene restarts

    // Grid properties
    const gridRows = 3;
    const gridCols = 3;
    const buttonSpacing = 90; // Spacing between buttons (adjust as needed)
    const startX = panelX - uiPanel.displayWidth; // Initial X position for the grid (user will adjust)
    const startY = panelY - uiPanel.displayHeight + 725; // Initial Y position for the grid (user will adjust)

    let itemIndex = 0; // To iterate through the items array

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        if (itemIndex >= this.items.length) {
          // Stop creating buttons if we've run out of items
          break;
        }

        const currentItem = this.items[itemIndex];
        const buttonX = startX + col * buttonSpacing;
        const buttonY = startY + row * buttonSpacing;

        // Add button using a specific frame from the texture
        const button = this.add.image(buttonX, buttonY, buttonTexture);
        button.setData("itemId", currentItem.id); // Store item id on the button

        // Set the specific frame for the button
        button.setCrop(
          buttonCropRect.x,
          buttonCropRect.y,
          buttonCropRect.width,
          buttonCropRect.height
        );

        // Apply the same scale as the panel
        button.setScale(buttonScale);

        // Adjust origin
        button.setOrigin(buttonOrigin.x, buttonOrigin.y);

        // Make the button interactive with the custom hit area
        button.setInteractive(hitAreaRect, hitAreaCallback);

        // --- Add Icon ---
        const iconOffsetX = 180; // Adjust as needed
        const iconOffsetY = 60; // Adjust as needed
        const icon = this.add.image(
          buttonX + iconOffsetX, // Add offset X
          buttonY + iconOffsetY, // Add offset Y
          "Farm", // Use the loaded Farm spritesheet
          currentItem.frameIndex // Use the frame index for this item
        );
        icon.setScale(4); // Scale icon similar to button maybe? Adjust if needed
        icon.setOrigin(0.5, 0.5); // Center the icon
        icon.setDepth(button.depth + 1); // Ensure icon is on top of the button

        // --- Event Listeners ---
        button.on(Phaser.Input.Events.POINTER_DOWN, () => {
          this.selectedItemId = currentItem.id;
          console.log(`Selected: ${currentItem.name}`);
          this.sfxButtonPress?.play(); // Play sound on click
          this.updateButtonVisuals();
          // TODO: Communicate selection back to MainScene if needed
        });

        button.on(Phaser.Input.Events.POINTER_OVER, () => {
          this.updateButtonVisuals(button); // Update visuals, highlighting this one for hover
        });

        button.on(Phaser.Input.Events.POINTER_OUT, () => {
          this.updateButtonVisuals(); // Update visuals, removing hover highlight
        });

        this.gridButtons.push(button); // Store the button reference
        itemIndex++;
      }
      if (itemIndex >= this.items.length) {
        break; // Break outer loop too
      }
    }
    this.updateButtonVisuals(); // Initial visual state update

    // Remove or comment out the global input debugging if it becomes too noisy
    // this.input.enableDebug(button); // Old line targeting a single button

    const tab = this.add.text(panelX - 880, panelY - 485, "Tab");
    tab.setBackgroundColor("brown");
    tab.setFontSize(24);
    tab.setFontFamily("Arial");
    tab.setColor("white");
    tab.setOrigin(0.5, 0.5);
    tab.setDepth(100);
    tab.setInteractive(hitAreaRect, hitAreaCallback);

    // --- Add Bitmap Text Test ---
    // Use dynamicBitmapText instead of bitmapText
    const testText = this.add.dynamicBitmapText(
      70, // X position
      70, // Y position
      "font_a", // Font key
      "idea jam jillian lilly jack jane isaiah", // Text to display
      128 // Font size (optional, defaults to font height)
    );
    testText.setTint(0xffffff); // Set color (optional)
    testText.setDepth(200); // Ensure it's visible
    testText.setLetterSpacing(-20); // Keep general letter spacing

    // Variable to track the total accumulated shift
    let accumulatedShift = 0;
    // Flag to track if the previous character was one requiring shifting
    let wasPreviousCharNarrow = false;

    // Define the display callback function
    const adjustLSpacing = (
      data: Phaser.Types.GameObjects.BitmapText.DisplayCallbackConfig
    ) => {
      // Reset state at the start of the text
      if (data.index === 0) {
        accumulatedShift = 0;
        wasPreviousCharNarrow = false;
      }

      const charCodeL = 108; // 'l'
      const charCodeI = 105; // 'i'
      const charCodeJ = 106; // 'j'
      const narrowChars = [charCodeL, charCodeI, charCodeJ];

      const shiftAmountNarrow = 6; // Standard *reduction* for narrow chars
      const extraShiftAfterNarrowSequence = 3; // Extra *reduction* after a narrow sequence ends
      const extraShiftBeforeNarrowSequence = 3; // Extra *increase* before a narrow sequence starts

      // Determine if the current character is narrow
      const isCurrentCharNarrow = narrowChars.includes(data.charCode);

      // Apply the accumulated negative shift from previous characters FIRST
      data.x -= accumulatedShift;

      // --- Handle spacing adjustments based on current/previous char type ---

      if (isCurrentCharNarrow) {
        // --- Current character IS narrow ---

        // Check if the PREVIOUS character was NOT narrow (transition: wide -> narrow)
        if (!wasPreviousCharNarrow && data.index > 0) {
          // Add extra space BEFORE the narrow sequence starts by shifting current char right
          data.x += extraShiftBeforeNarrowSequence;
          // Counteract this added space in the accumulator for subsequent chars
          // Since accumulatedShift represents *reduction*, we subtract the added space.
          accumulatedShift -= extraShiftBeforeNarrowSequence;
        }

        // Apply the standard negative shift to THIS narrow character
        data.x -= shiftAmountNarrow;
        // Add this character's negative shift amount to the accumulator
        accumulatedShift += shiftAmountNarrow;

        // Set the flag for the next character
        wasPreviousCharNarrow = true;
      } else {
        // --- Current character is NOT narrow ---

        // Check if the PREVIOUS character WAS narrow (transition: narrow -> wide)
        if (wasPreviousCharNarrow) {
          // Apply extra negative shift AFTER the narrow sequence just ended
          data.x -= extraShiftAfterNarrowSequence;
          accumulatedShift += extraShiftAfterNarrowSequence;
        }

        // Reset the flag as the current character is not narrow
        wasPreviousCharNarrow = false;
      }

      return data; // Return the (potentially modified) data object
    };

    // Assign the callback to the dynamic text object
    testText.setDisplayCallback(adjustLSpacing);
  }

  // --- Helper function to update button appearance ---
  private updateButtonVisuals(
    hoveredButton: Phaser.GameObjects.Image | null = null
  ) {
    const normalTint = 0xffffff; // No tint
    const hoverTint = 0xcccccc; // Slightly darker
    const selectedTint = 0xaaffaa; // Light green
    const selectedHoverTint = 0x88dd88; // Darker green

    this.gridButtons.forEach((button) => {
      const itemId = button.getData("itemId") as string;
      const isSelected = itemId === this.selectedItemId;
      const isHovered = button === hoveredButton;

      button.clearTint(); // Reset tint first

      if (isSelected && isHovered) {
        button.setTint(selectedHoverTint);
      } else if (isSelected) {
        button.setTint(selectedTint);
      } else if (isHovered) {
        button.setTint(hoverTint);
      } else {
        button.setTint(normalTint); // Default state
      }
    });
  }

  // --- Public method to get selected item ---
  public getSelectedItemId(): string | null {
    return this.selectedItemId;
  }
}
