import { db } from "../config/database.js";
import { users, categories, products, colors, sizes, productVariants } from "./schema/index.js";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // 1. Seed Admin User
    const adminPasswordHash = await bcrypt.hash("admin123456", 8);
    const [admin] = await db
      .insert(users)
      .values({
        name: "StyleFox Admin",
        email: "admin@stylefox.com",
        passwordHash: adminPasswordHash,
        role: "admin",
      })
      .onConflictDoNothing()
      .returning();

    console.log("✅ Admin user seeded or exists:", admin?.email ?? "already created");

    // 2. Seed Categories
    const sampleCategories = [
      { name: "Men's Collection", slug: "mens-collection", description: "Modern menswear and urban styles" },
      { name: "Women's Collection", slug: "womens-collection", description: "Elegant women's apparel and accessories" },
      { name: "Footwear", slug: "footwear", description: "Premium sneakers, formal shoes, and boots" },
      { name: "Accessories", slug: "accessories", description: "Watches, belts, bags, and sunglasses" },
    ];

    const insertedCategories = await db
      .insert(categories)
      .values(sampleCategories)
      .onConflictDoNothing()
      .returning();

    console.log(`✅ Seeded ${insertedCategories.length} categories.`);

    // 3. Seed Colors
    const sampleColors = [
      { name: "Midnight Black", hexCode: "#0a0a0a" },
      { name: "Washed Charcoal", hexCode: "#2b2b2b" },
      { name: "Pure White", hexCode: "#ffffff" },
      { name: "Faded Olive", hexCode: "#4a5340" },
      { name: "Storm Grey", hexCode: "#3f3f46" },
      { name: "Sand Beige", hexCode: "#d2b48c" },
    ];

    const insertedColors = await db
      .insert(colors)
      .values(sampleColors)
      .onConflictDoNothing()
      .returning();

    console.log(`✅ Seeded ${insertedColors.length} colors.`);

    // 4. Seed Sizes
    const sampleSizes = [
      { name: "Extra Small", code: "XS", sortOrder: 1 },
      { name: "Small", code: "S", sortOrder: 2 },
      { name: "Medium", code: "M", sortOrder: 3 },
      { name: "Large", code: "L", sortOrder: 4 },
      { name: "Extra Large", code: "XL", sortOrder: 5 },
      { name: "Double Extra Large", code: "XXL", sortOrder: 6 },
    ];

    const insertedSizes = await db
      .insert(sizes)
      .values(sampleSizes)
      .onConflictDoNothing()
      .returning();

    console.log(`✅ Seeded ${insertedSizes.length} sizes.`);

    // 5. Seed Products (Parent table: name, tagline, description, rating, reviewCount, features)
    const categoryList = await db.select().from(categories).limit(1);
    if (categoryList.length > 0) {
      const sampleProducts = [
        {
          name: "Oversized Streetwear Hoodie",
          slug: "oversized-streetwear-hoodie",
          tagline: "Heavyweight Relaxed Urban Silhouette",
          description: "Heavyweight cotton blend hoodie with relaxed dropped-shoulder silhouette.",
          rating: "4.8",
          reviewCount: 142,
          features: [
            "Heavyweight 400 GSM French Terry Cotton",
            "Double-layered structured hood without drawstrings",
            "Kangaroo front pouch with concealed stash pocket",
            "Pre-shrunk fabric to preserve boxy proportions"
          ],
          categoryId: categoryList[0].id,
        },
        {
          name: "Minimalist Linen Overshirt",
          slug: "minimalist-linen-overshirt",
          tagline: "Airy Pure Linen Layering Essential",
          description: "Breathable pure linen overshirt ideal for layering in warm climates.",
          rating: "4.6",
          reviewCount: 88,
          features: [
            "100% Normandy flax linen weave",
            "Mother-of-pearl buttons with reinforced shank stitching",
            "Twin chest utility pockets with flap closure",
            "Garment-dyed for a relaxed, lived-in feel"
          ],
          categoryId: categoryList[0].id,
        },
      ];

      const insertedProducts = await db
        .insert(products)
        .values(sampleProducts)
        .onConflictDoNothing()
        .returning();

      console.log(`✅ Seeded ${insertedProducts.length} sample products.`);

      // 6. Seed Product Variants linking product, color, and size
      const allProducts = await db.select().from(products).limit(2);
      const allColors = await db.select().from(colors).limit(2);
      const allSizes = await db.select().from(sizes).limit(3);

      if (allProducts.length > 0 && allColors.length > 0 && allSizes.length > 0) {
        const sampleVariants = [
          {
            productId: allProducts[0].id,
            colorId: allColors[0].id,
            sizeId: allSizes[0].id,
            sku: `SF-${allProducts[0].slug.slice(0, 6).toUpperCase()}-${allColors[0].name.slice(0, 3).toUpperCase()}-${allSizes[0].code}`,
            price: "59.99",
            sellingPrice: "49.99",
            stock: 15,
            images: ["https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80"],
          },
          {
            productId: allProducts[0].id,
            colorId: allColors[0].id,
            sizeId: allSizes[1].id,
            sku: `SF-${allProducts[0].slug.slice(0, 6).toUpperCase()}-${allColors[0].name.slice(0, 3).toUpperCase()}-${allSizes[1].code}`,
            price: "59.99",
            sellingPrice: "49.99",
            stock: 20,
            images: ["https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80"],
          },
          {
            productId: allProducts[0].id,
            colorId: allColors[1].id,
            sizeId: allSizes[1].id,
            sku: `SF-${allProducts[0].slug.slice(0, 6).toUpperCase()}-${allColors[1].name.slice(0, 3).toUpperCase()}-${allSizes[1].code}`,
            price: "69.99",
            sellingPrice: "59.99",
            stock: 10,
            images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80"],
          },
        ];

        await db.insert(productVariants).values(sampleVariants).onConflictDoNothing();
        console.log("✅ Seeded sample product variants.");
      }
    }

    console.log("✨ Database seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
