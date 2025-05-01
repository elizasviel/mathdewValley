import "phaser";

// Define the structure for our selectable items
interface SelectableItem {
  id: string;
  name: string;
  frameIndex: number; // Frame index from the Farm spritesheet
  count?: number; // Optional: For stackable items like gems
}

// Define the character set for the retro fonts - Escaped single quotes
const FONT_CHARS =
  '  1234567890AaBbCcDdEeFfGgHhIiJjKkLlMmNnñÑOoPpQqRrSsTtUuVvWwXxYyZz¡!¿?@/$&~Çç\\‘\\\'"".,;:/\\[]()}{-_=+\\*^%°X✓'; // Note: Escaped single quotes

export default class UIScene extends Phaser.Scene {
  // Rename 'items' to 'seedItems' and add 'generalItems'
  private seedItems: SelectableItem[] = [
    { id: "carrot", name: "Carrot", frameIndex: 26 },
    { id: "radish", name: "Radish", frameIndex: 76 },
    { id: "cabbage", name: "Cabbage", frameIndex: 126 },
    { id: "lettuce", name: "Lettuce", frameIndex: 176 },
    { id: "cauliflower", name: "Cauliflower", frameIndex: 226 },
    { id: "broccoli", name: "Broccoli", frameIndex: 276 },
    { id: "garlic", name: "Garlic", frameIndex: 326 },
    // Add more seeds if needed up to 12
  ];
  private generalItems: SelectableItem[] = [
    { id: "fertilizer", name: "Fertilizer", frameIndex: 42 }, // Not countable for now
    { id: "gem_blue", name: "Blue Gem", frameIndex: 1330, count: 0 },
    { id: "gem_purple", name: "Purple Gem", frameIndex: 1387, count: 0 },
    { id: "gem_green", name: "Green Gem", frameIndex: 1444, count: 0 },
    { id: "gem_red", name: "Red Gem", frameIndex: 1501, count: 0 },
    // Harvested Crops (Using Harvest floating effect index as icon)
    { id: "carrot", name: "Carrot", frameIndex: 33, count: 0 },
    { id: "radish", name: "Radish", frameIndex: 83, count: 0 },
    { id: "cabbage", name: "Cabbage", frameIndex: 133, count: 0 },
    { id: "lettuce", name: "Lettuce", frameIndex: 183, count: 0 },
    { id: "cauliflower", name: "Cauliflower", frameIndex: 233, count: 0 },
    { id: "broccoli", name: "Broccoli", frameIndex: 283, count: 0 },
    { id: "garlic", name: "Garlic", frameIndex: 333, count: 0 },
    // Add more general items if needed up to 12
    // Example: { id: "hoe", name: "Hoe", frameIndex: someIndex },
  ];
  private selectedItemId: string | null = null; // Allow null initially
  private gridButtons: Phaser.GameObjects.Image[] = [];
  private gridIcons: Phaser.GameObjects.Image[] = []; // Array to store icon references
  private gridCounts: Phaser.GameObjects.Text[] = []; // Array to store count text objects
  private sfxButtonPress!: Phaser.Sound.BaseSound;

  // Tab related state and objects
  private activeTab: "SEEDS" | "ITEMS" = "SEEDS";
  private seedsTab!: Phaser.GameObjects.DynamicBitmapText;
  private itemsTab!: Phaser.GameObjects.DynamicBitmapText;

  // Grid properties (moved here for easier access in updateGridContent)
  private readonly gridRows = 4; // Updated to 4 rows
  private readonly gridCols = 3; // Updated to 3 columns
  private readonly buttonSpacing = 90;
  private panelX!: number; // Will be set in create
  private panelY!: number; // Will be set in create
  private uiPanel!: Phaser.GameObjects.Image; // To calculate start positions
  private gridPlaceholders: Phaser.GameObjects.Image[] = []; // Add this array

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
    const fontAConfig = {
      image: "font_a",
      width: 32,
      height: 32,
      chars: FONT_CHARS,
      charsPerRow: 18,
      offset: { x: 0, y: 0 },
      spacing: { x: 0, y: 0 },
      lineSpacing: 0,
    };
    this.cache.bitmapFont.add(
      "font_a",
      Phaser.GameObjects.RetroFont.Parse(this, fontAConfig as any)
    );
    const fontBConfig = {
      image: "font_b",
      width: 32,
      height: 32,
      chars: FONT_CHARS,
      charsPerRow: 18,
      offset: { x: 0, y: 0 },
      spacing: { x: 0, y: 0 },
      lineSpacing: 0,
    };
    this.cache.bitmapFont.add(
      "font_b",
      Phaser.GameObjects.RetroFont.Parse(this, fontBConfig as any)
    );
    // --- End Font Parsing ---

    // Get screen dimensions
    const { width: screenWidth, height: screenHeight } = this.scale;

    // Initialize the sound effect
    this.sfxButtonPress = this.sound.add("buttonpress");

    // Define margin from screen edges
    const margin = 0;

    // Calculate position for bottom-right corner and store panel reference
    this.panelX = screenWidth - margin;
    this.panelY = screenHeight - margin;
    this.uiPanel = this.add.image(this.panelX, this.panelY, "ui_wood_flat");
    this.uiPanel.setCrop(0, 225, 160, 160);
    this.uiPanel.setOrigin(0.71, 1);
    this.uiPanel.setScale(2.1, 3);

    // Define button properties
    const buttonTexture = "ui_wood_flat";
    const buttonCropRect = { x: 161, y: 193, width: 48, height: 48 };
    const buttonScale = 2.5;
    const buttonOrigin = { x: 0.5, y: 0.5 };
    // Define a hit area for tabs (can reuse or define new one)
    const tabHitAreaRect = new Phaser.Geom.Rectangle(0, 0, 100, 50); // Adjust size as needed
    const tabHitAreaCallback = Phaser.Geom.Rectangle.Contains;

    this.gridButtons = []; // Clear previous buttons if scene restarts

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

    // --- Create Scrollbar ---
    const scrollbarX = this.panelX - 282;
    const scrollbarY = this.panelY - 618;

    const scrollbar = this.add.image(scrollbarX, scrollbarY, "ui_wood_flat");
    scrollbar.setCrop(210, 255, 24, 128);
    scrollbar.setScale(2.5, 3);
    scrollbar.setOrigin(0.5, 0.5);
    scrollbar.setDepth(100);

    // --- Create Tabs ---
    const tabY = this.panelY - 440; // Y position for tabs
    const tabFontSize = 64; // Font size for tabs
    const tabDepth = 100;
    const tabLetterSpacing = -20; // Adjust letter spacing
    const tabBgPaddingX = 0; // Horizontal padding for background
    const tabBgPaddingY = 0; // Vertical padding for background

    // Seeds Tab
    this.seedsTab = this.add.dynamicBitmapText(
      this.panelX - 330, // X position
      tabY,
      "font_a",
      "SEEDS",
      tabFontSize
    );
    this.seedsTab.setLetterSpacing(tabLetterSpacing);
    this.seedsTab.setOrigin(0, 0.5); // Align left, vertically center
    this.seedsTab.setDepth(tabDepth);
    this.seedsTab.setInteractive(tabHitAreaRect, tabHitAreaCallback); // Use tab hit area
    this.seedsTab.setDisplayCallback(adjustLSpacing); // Apply kerning

    // Add background rectangle for Seeds tab
    const seedsBgWidth = this.seedsTab.width + 2 * tabBgPaddingX;
    const seedsBgHeight = this.seedsTab.height + 2 * tabBgPaddingY;
    const seedsBg = this.add.rectangle(
      this.seedsTab.x + this.seedsTab.width / 2 - tabBgPaddingX, // Center X relative to text
      this.seedsTab.y, // Center Y
      seedsBgWidth,
      seedsBgHeight
    );
    seedsBg.setOrigin(0.5, 0.5);
    seedsBg.setDepth(tabDepth - 1); // Ensure background is behind text

    this.seedsTab.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.activeTab !== "SEEDS") {
        this.activeTab = "SEEDS";
        console.log("Switched to Seeds tab");
        this.sfxButtonPress?.play();
        this.updateTabVisuals();
        this.updateGridContent(this.seedItems); // Update grid with seeds
        // Deselect item when switching tabs
        this.selectedItemId = null;
        this.updateButtonVisuals();
      }
    });
    this.seedsTab.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.updateTabVisuals(this.seedsTab);
    });
    this.seedsTab.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.updateTabVisuals();
    });

    // Items Tab
    this.itemsTab = this.add.dynamicBitmapText(
      this.panelX - 190, // Adjust X position for spacing
      tabY,
      "font_a",
      "ITEMS",
      tabFontSize
    );
    this.itemsTab.setLetterSpacing(tabLetterSpacing);
    this.itemsTab.setOrigin(0, 0.5); // Align left, vertically center
    this.itemsTab.setDepth(tabDepth);
    this.itemsTab.setInteractive(tabHitAreaRect, tabHitAreaCallback); // Use tab hit area
    this.itemsTab.setDisplayCallback(adjustLSpacing); // Apply kerning

    // Add background rectangle for Items tab
    const itemsBgWidth = this.itemsTab.width + 2 * tabBgPaddingX;
    const itemsBgHeight = this.itemsTab.height + 2 * tabBgPaddingY;
    const itemsBg = this.add.rectangle(
      this.itemsTab.x + this.itemsTab.width / 2 - tabBgPaddingX, // Center X relative to text
      this.itemsTab.y, // Center Y
      itemsBgWidth,
      itemsBgHeight
    );
    itemsBg.setOrigin(0.5, 0.5);
    itemsBg.setDepth(tabDepth - 1); // Ensure background is behind text

    this.itemsTab.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.activeTab !== "ITEMS") {
        this.activeTab = "ITEMS";
        console.log("Switched to Items tab");
        this.sfxButtonPress?.play();
        this.updateTabVisuals();
        this.updateGridContent(this.generalItems); // Update grid with items
        // Deselect item when switching tabs
        this.selectedItemId = null;
        this.updateButtonVisuals();
      }
    });
    this.itemsTab.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.updateTabVisuals(this.itemsTab);
    });
    this.itemsTab.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.updateTabVisuals();
    });

    this.updateTabVisuals(); // Initial visual state update for tabs

    // --- Initial Grid Population ---
    this.updateGridContent(this.seedItems); // Show seeds initially
  }

  // --- Method to update the grid content ---
  private updateGridContent(itemsToShow: SelectableItem[]) {
    // 1. Clear existing buttons, icons, counts AND placeholders
    this.gridPlaceholders.forEach((placeholder) => placeholder.destroy());
    this.gridButtons.forEach((button) => button.destroy());
    this.gridIcons.forEach((icon) => icon.destroy());
    this.gridCounts.forEach((countText) => countText.destroy()); // Clear counts
    this.gridPlaceholders = [];
    this.gridButtons = [];
    this.gridIcons = [];
    this.gridCounts = []; // Clear counts array

    // Reset selected item ID if it's not in the new list
    if (
      this.selectedItemId &&
      !itemsToShow.some((item) => item.id === this.selectedItemId)
    ) {
      this.selectedItemId = null;
    }

    // 2. Define button/placeholder properties
    const placeholderTexture = "ui_wood_flat";
    const placeholderCropRect = { x: 161, y: 193, width: 48, height: 48 };
    const placeholderScale = 2.5;
    const placeholderOrigin = { x: 0.5, y: 0.5 };
    const emptySlotTint = 0x888888; // Grey tint for empty slots

    // Define interactive button properties (can share some with placeholder)
    const buttonTexture = placeholderTexture; // Often the same texture
    const buttonCropRect = placeholderCropRect; // Often the same crop
    const buttonScale = placeholderScale;
    const buttonOrigin = placeholderOrigin;
    const hitAreaRect = new Phaser.Geom.Rectangle(164, 195, 40, 40);
    const hitAreaCallback = Phaser.Geom.Rectangle.Contains;

    // Calculate start positions
    const startX = this.panelX - this.uiPanel.displayWidth + 22;
    const startY = this.panelY - this.uiPanel.displayHeight + 725;

    // 3. Populate grid - Create placeholders first, then items on top
    let itemIndex = 0;
    const totalSlots = this.gridRows * this.gridCols;

    for (let i = 0; i < totalSlots; i++) {
      const row = Math.floor(i / this.gridCols);
      const col = i % this.gridCols;

      const slotX = startX + col * this.buttonSpacing;
      const slotY = startY + row * this.buttonSpacing;

      // --- Create Placeholder for EVERY slot ---
      const placeholder = this.add.image(slotX, slotY, placeholderTexture);
      placeholder.setCrop(
        placeholderCropRect.x,
        placeholderCropRect.y,
        placeholderCropRect.width,
        placeholderCropRect.height
      );
      placeholder.setScale(placeholderScale);
      placeholder.setOrigin(placeholderOrigin.x, placeholderOrigin.y);
      placeholder.setTint(emptySlotTint); // Make it look empty/disabled
      placeholder.setDepth(0); // Base layer
      this.gridPlaceholders.push(placeholder);

      // --- If item exists, add Button, Icon, and Count Text ---
      if (itemIndex < itemsToShow.length) {
        const currentItem = itemsToShow[itemIndex];

        // Add interactive Button (on top of placeholder)
        const button = this.add.image(slotX, slotY, buttonTexture);
        button.setData("itemId", currentItem.id);
        button.setCrop(
          buttonCropRect.x,
          buttonCropRect.y,
          buttonCropRect.width,
          buttonCropRect.height
        );
        button.setScale(buttonScale);
        button.setOrigin(buttonOrigin.x, buttonOrigin.y);
        button.setInteractive(hitAreaRect, hitAreaCallback);
        button.setDepth(1); // Ensure button is above placeholder

        // Add Icon (on top of button)
        const iconOffsetX = 180; // Adjust as needed relative to slot center
        const iconOffsetY = 60; // Adjust as needed relative to slot center

        // Determine the correct texture key based on the item ID
        const isGem = currentItem.id.startsWith("gem_");
        const iconTextureKey = isGem ? "Loot" : "Farm";

        const icon = this.add.image(
          slotX + iconOffsetX,
          slotY + iconOffsetY,
          iconTextureKey, // Use the determined texture key
          currentItem.frameIndex
        );
        icon.setScale(4);
        icon.setOrigin(0.5, 0.5);
        icon.setDepth(button.depth + 1); // Ensure icon is on top

        // Add Count Text if item is countable
        let countText: Phaser.GameObjects.Text | null = null; // Declare outside the block
        if (currentItem.count !== undefined) {
          const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            font: "32px monospace",
            color: "#000000",
            stroke: "#ffffff",
            strokeThickness: 1,
            align: "right",
          };
          // Position count text (e.g., bottom right of the button/slot area)
          const textX = slotX + 220; // Adjust offset as needed from slot center
          const textY = slotY + 100; // Adjust offset as needed from slot center

          // Assign to the outer variable
          countText = this.add.text(
            textX,
            textY,
            currentItem.count.toString(),
            textStyle
          );
          countText.setOrigin(1, 1); // Align bottom-right of its own bounds
          countText.setDepth(icon.depth + 1); // Ensure count text is on top
          countText.setData("itemId", currentItem.id); // Store itemId for easy lookup later
        }

        // Event Listeners for the interactive button
        button.on(Phaser.Input.Events.POINTER_DOWN, () => {
          this.selectedItemId = currentItem.id;
          console.log(`Selected: ${currentItem.name}`);
          this.sfxButtonPress?.play();
          this.updateButtonVisuals();
        });
        button.on(Phaser.Input.Events.POINTER_OVER, () =>
          this.updateButtonVisuals(button)
        );
        button.on(Phaser.Input.Events.POINTER_OUT, () =>
          this.updateButtonVisuals()
        );

        this.gridButtons.push(button); // Store button
        this.gridIcons.push(icon); // Store icon
        if (countText) {
          this.gridCounts.push(countText); // Store count text object if it was created
        }

        // We can optionally hide or destroy the placeholder now that an item is here
        // placeholder.setVisible(false); // Or placeholder.destroy();
        // For simplicity, we'll just let the button cover the tinted placeholder.
      }

      itemIndex++; // Increment index regardless of item presence
    }

    // 4. Update visual state of newly created buttons
    this.updateButtonVisuals();
  }

  // --- Helper function to update button appearance ---
  private updateButtonVisuals(
    hoveredButton: Phaser.GameObjects.Image | null = null
  ) {
    const normalTint = 0xffffff;
    const hoverTint = 0xcccccc;
    const selectedTint = 0xaaffaa;
    const selectedHoverTint = 0x88dd88;

    this.gridButtons.forEach((button) => {
      const itemId = button.getData("itemId") as string;
      // Check if selectedItemId is not null before comparing
      const isSelected =
        this.selectedItemId !== null && itemId === this.selectedItemId;
      const isHovered = button === hoveredButton;

      button.clearTint();

      if (isSelected && isHovered) {
        button.setTint(selectedHoverTint);
      } else if (isSelected) {
        button.setTint(selectedTint);
      } else if (isHovered) {
        button.setTint(hoverTint);
      } else {
        button.setTint(normalTint);
      }
    });
  }

  // --- Helper function to update tab appearance ---
  private updateTabVisuals(
    hoveredTab: Phaser.GameObjects.DynamicBitmapText | null = null
  ) {
    const normalTint = 0xffffff;
    const hoverTint = 0xdddddd;
    const activeTint = 0xffffaa;
    const activeHoverTint = 0xcccc88;

    // Seeds Tab
    const isSeedsActive = this.activeTab === "SEEDS";
    const isSeedsHovered = this.seedsTab === hoveredTab;
    this.seedsTab.clearTint();
    if (isSeedsActive && isSeedsHovered) this.seedsTab.setTint(activeHoverTint);
    else if (isSeedsActive) this.seedsTab.setTint(activeTint);
    else if (isSeedsHovered) this.seedsTab.setTint(hoverTint);
    else this.seedsTab.setTint(normalTint);

    // Items Tab
    const isItemsActive = this.activeTab === "ITEMS";
    const isItemsHovered = this.itemsTab === hoveredTab;
    this.itemsTab.clearTint();
    if (isItemsActive && isItemsHovered) this.itemsTab.setTint(activeHoverTint);
    else if (isItemsActive) this.itemsTab.setTint(activeTint);
    else if (isItemsHovered) this.itemsTab.setTint(hoverTint);
    else this.itemsTab.setTint(normalTint);
  }

  // --- Public method to get selected item ---
  public getSelectedItemId(): string | null {
    return this.selectedItemId;
  }

  // --- Public method to increment item count ---
  public incrementItemCount(itemId: string, amount: number = 1): void {
    const itemIndex = this.generalItems.findIndex((item) => item.id === itemId);

    if (itemIndex !== -1 && this.generalItems[itemIndex].count !== undefined) {
      this.generalItems[itemIndex].count! += amount;
      console.log(
        `Incremented ${itemId}. New count: ${this.generalItems[itemIndex].count}`
      );

      // Update the corresponding text object if the "ITEMS" tab is active
      if (this.activeTab === "ITEMS") {
        // Find the text object associated with this item ID
        const countText = this.gridCounts.find(
          (text) => text.getData("itemId") === itemId
        );

        if (countText) {
          countText.setText(this.generalItems[itemIndex].count!.toString());
          console.log(`Updated text for ${itemId}`);
        } else {
          console.warn(
            `Could not find count text for ${itemId} to update. It might be because the ITEMS tab is not currently visible, or the item wasn't rendered correctly.`
          );
          // Optionally, force a grid refresh if the tab isn't active,
          // although the count will update when the tab is next opened.
          // if (this.activeTab !== 'ITEMS') {
          //   this.updateGridContent(this.generalItems);
          // }
        }
      }
    } else {
      console.warn(`Item ${itemId} not found or is not countable.`);
    }
  }
}
