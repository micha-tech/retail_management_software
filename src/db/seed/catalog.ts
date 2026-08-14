export type SeedProduct = {
  name: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  unit?: string;
};

export const seedProducts: SeedProduct[] = [
  { name: "Coca-Cola 50cl", category: "Beverages", sellingPrice: 35000, costPrice: 27000 },
  { name: "Pepsi 50cl", category: "Beverages", sellingPrice: 33000, costPrice: 25000 },
  { name: "Bottled Water 75cl", category: "Beverages", sellingPrice: 20000, costPrice: 13000 },
  { name: "Orange Juice 1L", category: "Beverages", sellingPrice: 180000, costPrice: 145000 },
  { name: "Malt Drink 33cl", category: "Beverages", sellingPrice: 45000, costPrice: 35000 },
  { name: "Pineapple Juice 1L", category: "Beverages", sellingPrice: 175000, costPrice: 138000 },
  { name: "Instant Coffee 100g", category: "Beverages", sellingPrice: 320000, costPrice: 260000 },
  { name: "Black Tea 50 Bags", category: "Beverages", sellingPrice: 145000, costPrice: 110000 },

  { name: "Long Grain Rice 1kg", category: "Groceries", sellingPrice: 185000, costPrice: 150000, unit: "bag" },
  { name: "Brown Beans 1kg", category: "Groceries", sellingPrice: 220000, costPrice: 180000, unit: "bag" },
  { name: "Garri 1kg", category: "Groceries", sellingPrice: 130000, costPrice: 100000, unit: "bag" },
  { name: "Spaghetti 500g", category: "Groceries", sellingPrice: 85000, costPrice: 65000 },
  { name: "Instant Noodles 120g", category: "Groceries", sellingPrice: 35000, costPrice: 26000 },
  { name: "Vegetable Oil 1L", category: "Groceries", sellingPrice: 250000, costPrice: 210000 },
  { name: "Tomato Paste 400g", category: "Groceries", sellingPrice: 95000, costPrice: 72000 },
  { name: "Granulated Sugar 1kg", category: "Groceries", sellingPrice: 175000, costPrice: 140000, unit: "bag" },
  { name: "Table Salt 500g", category: "Groceries", sellingPrice: 50000, costPrice: 35000 },
  { name: "Milk Powder 400g", category: "Groceries", sellingPrice: 380000, costPrice: 315000 },
  { name: "Breakfast Cereal 500g", category: "Groceries", sellingPrice: 350000, costPrice: 285000 },
  { name: "Wheat Flour 1kg", category: "Groceries", sellingPrice: 165000, costPrice: 130000, unit: "bag" },
  { name: "Semolina 1kg", category: "Groceries", sellingPrice: 190000, costPrice: 152000, unit: "bag" },
  { name: "Canned Sardines 125g", category: "Groceries", sellingPrice: 150000, costPrice: 118000 },

  { name: "White Bread Large Loaf", category: "Fresh Food", sellingPrice: 140000, costPrice: 105000, unit: "loaf" },
  { name: "Crate Eggs 30 Pack", category: "Fresh Food", sellingPrice: 650000, costPrice: 550000, unit: "crate" },
  { name: "Fresh Tomatoes 1kg", category: "Fresh Food", sellingPrice: 180000, costPrice: 135000, unit: "kg" },
  { name: "Fresh Onions 1kg", category: "Fresh Food", sellingPrice: 160000, costPrice: 120000, unit: "kg" },
  { name: "Yam Tuber Medium", category: "Fresh Food", sellingPrice: 280000, costPrice: 220000 },

  { name: "Frozen Chicken 1kg", category: "Frozen Foods", sellingPrice: 520000, costPrice: 440000, unit: "kg" },
  { name: "Frozen Turkey 1kg", category: "Frozen Foods", sellingPrice: 680000, costPrice: 590000, unit: "kg" },
  { name: "Frozen Mackerel 1kg", category: "Frozen Foods", sellingPrice: 450000, costPrice: 375000, unit: "kg" },
  { name: "Frozen French Fries 1kg", category: "Frozen Foods", sellingPrice: 390000, costPrice: 315000 },
  { name: "Vanilla Ice Cream 1L", category: "Frozen Foods", sellingPrice: 420000, costPrice: 340000 },

  { name: "Plantain Chips 100g", category: "Snacks", sellingPrice: 75000, costPrice: 50000 },
  { name: "Digestive Biscuits 250g", category: "Snacks", sellingPrice: 120000, costPrice: 90000 },
  { name: "Milk Chocolate Bar 45g", category: "Snacks", sellingPrice: 80000, costPrice: 58000 },
  { name: "Roasted Groundnuts 150g", category: "Snacks", sellingPrice: 65000, costPrice: 42000 },
  { name: "Cheese Puffs 100g", category: "Snacks", sellingPrice: 70000, costPrice: 48000 },

  { name: "Laundry Detergent 1kg", category: "Household", sellingPrice: 290000, costPrice: 235000 },
  { name: "Dishwashing Liquid 500ml", category: "Household", sellingPrice: 120000, costPrice: 85000 },
  { name: "Toilet Tissue 4 Pack", category: "Household", sellingPrice: 180000, costPrice: 135000, unit: "pack" },
  { name: "Household Bleach 1L", category: "Household", sellingPrice: 110000, costPrice: 78000 },
  { name: "Multipurpose Cleaner 750ml", category: "Household", sellingPrice: 145000, costPrice: 105000 },
  { name: "Bin Liners 20 Pack", category: "Household", sellingPrice: 130000, costPrice: 92000, unit: "pack" },
  { name: "Insecticide Spray 300ml", category: "Household", sellingPrice: 250000, costPrice: 195000 },

  { name: "Stainless Steel Spoon Set", category: "Kitchen & Utensils", sellingPrice: 240000, costPrice: 170000, unit: "set" },
  { name: "Dinner Plate 10 Inch", category: "Kitchen & Utensils", sellingPrice: 150000, costPrice: 105000 },
  { name: "Plastic Food Container 1L", category: "Kitchen & Utensils", sellingPrice: 120000, costPrice: 80000 },
  { name: "Kitchen Knife 8 Inch", category: "Kitchen & Utensils", sellingPrice: 260000, costPrice: 185000 },
  { name: "Non-Stick Frying Pan 24cm", category: "Kitchen & Utensils", sellingPrice: 850000, costPrice: 680000 },
  { name: "Glass Tumbler Set of 6", category: "Kitchen & Utensils", sellingPrice: 480000, costPrice: 350000, unit: "set" },

  { name: "Bath Soap 150g", category: "Personal Care", sellingPrice: 95000, costPrice: 68000 },
  { name: "Toothpaste 140g", category: "Personal Care", sellingPrice: 145000, costPrice: 105000 },
  { name: "Body Lotion 400ml", category: "Personal Care", sellingPrice: 280000, costPrice: 215000 },
  { name: "Shampoo 400ml", category: "Personal Care", sellingPrice: 320000, costPrice: 245000 },
  { name: "Roll-On Deodorant 50ml", category: "Personal Care", sellingPrice: 180000, costPrice: 130000 },
  { name: "Baby Diapers Medium 20 Pack", category: "Personal Care", sellingPrice: 520000, costPrice: 425000, unit: "pack" },

  { name: "Paracetamol 500mg 12 Pack", category: "Pharmacy", sellingPrice: 60000, costPrice: 35000, unit: "pack" },
  { name: "Vitamin C Tablets 20 Pack", category: "Pharmacy", sellingPrice: 110000, costPrice: 75000, unit: "pack" },
  { name: "Hand Sanitizer 250ml", category: "Pharmacy", sellingPrice: 125000, costPrice: 85000 },
  { name: "Cotton Wool 100g", category: "Pharmacy", sellingPrice: 90000, costPrice: 58000 },
];

export const seedCategories = [...new Set(seedProducts.map((product) => product.category))];

export function seedProductValues(product: SeedProduct, index: number) {
  return {
    name: product.name,
    sku: `SKU-${String(index + 1).padStart(3, "0")}`,
    barcode: `100000000${String(index + 1).padStart(3, "0")}`,
    sellingPrice: BigInt(product.sellingPrice),
    costPrice: BigInt(product.costPrice),
    unit: product.unit ?? "each",
    minimumStockLevel: 10,
  };
}
