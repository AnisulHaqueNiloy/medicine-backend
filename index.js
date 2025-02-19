const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://medistore-anisulhaque.netlify.app",
    ],
  })
);
app.use(express.json());
app.get("/", (req, res) => {
  res.send("server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3zxuw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollection = client.db("Medicine-shop").collection("users");
    const categoryCollection = client
      .db("Medicine-shop")
      .collection("categories");
    const medicineCollection = client
      .db("Medicine-shop")
      .collection("medicine");

    const advertisementCollection = client
      .db("Medicine-shop")
      .collection("advertisement");

    const cartCollection = client.db("Medicine-shop").collection("carts");
    const paymentCollection = client.db("Medicine-shop").collection("payments");

    // jwt token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // verify token
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.SECRET_KEY, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    const verifySeller = async (req, res, next) => {
      const email = req.decoded.email;
      // console.log("Email in verifySeller:", email);
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isSeller = user?.role === "seller";
      if (!isSeller) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // save or update user in db

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };

      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send(isExist);
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // admin..............................................
    // get all user
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //delete user
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    //admin makeing route
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // making seller
    app.patch(
      "/users/seller/:id",

      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "seller", // Set the role to "seller"
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    app.get(
      "/users/seller/:email",

      async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email });
        res.send({ seller: user?.role === "seller" });
      }
    );

    // making user
    app.patch("/users/user/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "seller", // Set the role to "seller"
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/users/seller-user/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "user", // Set the role to "seller"
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // admin category
    app.post("/admincategory", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await categoryCollection.insertOne(item);
      res.send(result);
    });

    app.get("/admincategory", verifyToken, verifyAdmin, async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    // delete category
    // app.delete(
    //   "/category/delete/:id",
    //   verifyToken,
    //   verifyAdmin,
    //   async (req, res) => {
    //     const id = req.params.id;
    //     const query = { _id: new ObjectId(id) };
    //     const result = await categoryCollection.deleteOne(query);
    //     res.send(result);
    //   }
    // );
    // delete category and medicines associated with it
    app.delete(
      "/category/delete/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;

        // Start a session for a transaction
        const session = await client.startSession();
        session.startTransaction();

        try {
          const categoryQuery = { _id: new ObjectId(id) };

          // Find the category to get its name (or any other identifier)
          const category = await categoryCollection.findOne(categoryQuery);

          if (!category) {
            return res.status(404).send({ message: "Category not found" });
          }

          // Delete medicines that are associated with this category
          const deleteMedicinesResult = await medicineCollection.deleteMany(
            { category: category.category },
            { session }
          );

          if (deleteMedicinesResult.deletedCount === 0) {
            // console.log("No medicines found for this category");
          }

          // Now delete the category
          const deleteCategoryResult = await categoryCollection.deleteOne(
            categoryQuery,
            { session }
          );

          if (deleteCategoryResult.deletedCount === 0) {
            throw new Error("Failed to delete category");
          }

          // Commit the transaction if both deletions are successful
          await session.commitTransaction();
          session.endSession();

          res.send({
            message: "Category and associated medicines deleted successfully.",
            deletedCount: deleteCategoryResult.deletedCount, // Include the deletedCount
          });
        } catch (error) {
          // Abort the transaction in case of an error
          await session.abortTransaction();
          session.endSession();
          res.status(500).send({
            message: "Failed to delete category and medicines",
            error: error.message,
          });
        }
      }
    );

    // update category
    app.put(
      "/category/update/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const data = req.body;

        const { img, name } = data;
        const updated = {
          $set: {
            name: name,
            image: img,
          },
        };
        const result = await categoryCollection.updateOne(filter, updated);
        res.send(result);
      }
    );

    // admin.........................admin
    // ............................................................seller....................................................................
    // get all the category
    app.get("/category", verifyToken, verifyAdmin, async (req, res) => {
      const category = await categoryCollection.find().toArray();
      res.send(category);
    });

    // addmedicines ..............
    app.post("/addmedicine", verifyToken, verifySeller, async (req, res) => {
      const medicine = req.body;
      const result = await medicineCollection.insertOne(medicine);
      res.send(result);
    });

    app.get("/getmedicine", verifyToken, verifySeller, async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail: email };
      const medicine = await medicineCollection.find(query).toArray();
      res.send(medicine);
    });

    app.post(
      "/advertisement/:id",
      verifyToken,
      verifySeller,
      async (req, res) => {
        const { id } = req.params; // Get the medicine ID from params
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid medicine ID" });
        }

        const { image, description, sellerEmail, medicineName } = req.body;

        const newData = {
          medicineName,
          image,
          sellerEmail,
          medicineId: id,
          description,
          status: "Pending",
        };

        const result = await advertisementCollection.insertOne(newData);
        res.send(result);
      }
    );

    app.get(
      "/getadvertisement",

      async (req, res) => {
        const email = req.query.email;
        let query = {};

        // If email is provided, filter by email
        if (email) {
          query = { sellerEmail: email };
        }

        const result = await advertisementCollection.find(query).toArray();
        res.send(result);
      }
    );
    app.get("/paymentsstatus", verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });
    app.patch(
      "/payment/accept/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        const update = {
          $set: {
            status: "Paid",
          },
        };
        const result = await paymentCollection.updateOne(query, update);
        res.send(result);
      }
    );

    app.patch(
      "/advertisement/accept/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        const update = {
          $set: {
            status: "Approved",
          },
        };
        const result = await advertisementCollection.updateOne(query, update);
        res.send(result);
      }
    );

    app.delete(
      "/advertisement/delete/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await advertisementCollection.deleteOne(query);
        res.send(result);
      }
    );

    // ............................................................seller..........................................................selllllerrrrr..........
    // user api for fetch meddicine ...........................
    app.get("/getcategorymedicine", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    app.get("/get/discount", async (req, res) => {
      const category = req.query.category;
      let query = {};
      if (category) {
        query = { category: category };
      }

      const result = await medicineCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/get/category", async (req, res) => {
      const category = req.query.category;
      let query = {};
      if (category) {
        query = { category: category };
      }

      const result = await medicineCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/get/invoice", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { sellerEmail: email };
      }

      const result = await medicineCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/get/medicine", async (req, res) => {
      try {
        const {
          category,
          page = 1,
          limit = 10,
          sort = "asc",
          search = "",
        } = req.query;

        // Pagination variables
        const pageNumber = parseInt(page);
        const itemsPerPage = parseInt(limit);
        const skip = (pageNumber - 1) * itemsPerPage;

        // Build query filter for search and category
        let query = {};
        if (category) {
          query.category = category;
        }
        if (search) {
          query.$or = [
            { itemName: { $regex: search, $options: "i" } }, // Case-insensitive search
            { genericName: { $regex: search, $options: "i" } },
            { company: { $regex: search, $options: "i" } },
          ];
        }

        // Sort direction
        const sortDirection = sort === "asc" ? 1 : -1;

        // Fetch data with pagination, sorting, and search
        const medicines = await medicineCollection
          .find(query)
          .sort({ price: sortDirection }) // Sort by price
          .skip(skip) // Skip items for pagination
          .limit(itemsPerPage) // Limit items per page
          .toArray();

        // Get total count for pagination
        const totalItems = await medicineCollection.countDocuments(query);

        res.send({
          medicines,
          totalItems,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalItems / itemsPerPage),
        });
      } catch (error) {
        // console.error("Error fetching medicines:", error);
        res.status(500).send({ error: "Failed to fetch medicines" });
      }
    });

    // ..........................add to carts

    app.post("/addtocart", verifyToken, async (req, res) => {
      const cartitem = req.body;
      const result = await cartCollection.insertOne(cartitem);
      res.send(result);
    });

    app.get("/getCart", async (req, res) => {
      const email = req.query.email;
      const query = { buyer: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/cart/update/:id", async (req, res) => {
      const { id } = req.params; // Get the cart item's ID

      try {
        // Use MongoDB's $inc operator to increase the quantity by 1
        const result = await cartCollection.updateOne(
          { _id: new ObjectId(id) }, // Match the specific cart item
          { $inc: { quantity: 1 } } // Increment the quantity
        );

        if (result.modifiedCount > 0) {
          // Fetch the updated cart item to return in the response
          const updatedItem = await cartCollection.findOne({
            _id: new ObjectId(id),
          });
          res.status(200).send(updatedItem); // Send the updated item back
        } else {
          res.status(404).send({ error: "Cart item not found or unchanged" });
        }
      } catch (error) {
        res.status(500).send({ error: "Failed to update quantity" });
      }
    });

    app.patch("/cart/decrease/:id", async (req, res) => {
      const { id } = req.params; // Get the cart item's ID

      try {
        // Find the current quantity of the item
        const cartItem = await cartCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!cartItem) {
          return res.status(404).send({ error: "Cart item not found" });
        }

        // If the quantity is already 1, prevent decrementing
        if (cartItem.quantity <= 1) {
          return res
            .status(400)
            .send({ error: "Quantity cannot be less than 1" });
        }

        // Decrease the quantity by 1 using $inc
        const result = await cartCollection.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { quantity: -1 } }
        );

        if (result.modifiedCount > 0) {
          // Fetch the updated cart item to return in the response
          const updatedItem = await cartCollection.findOne({
            _id: new ObjectId(id),
          });
          res.status(200).send(updatedItem); // Send the updated item back
        } else {
          res.status(404).send({ error: "Cart item not found or unchanged" });
        }
      } catch (error) {
        res.status(500).send({ error: "Failed to update quantity" });
      }
    });
    // ...................................increment decrement

    // remove from cart
    app.delete("/item/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/cart/clear", async (req, res) => {
      console.log("Clear cart API called");
      try {
        const result = await cartCollection.deleteMany({});
        console.log("Cart cleared successfully:", result);
        res.status(200).send(result);
      } catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).send({ error: "Failed to clear cart" });
      }
    });

    // console.log(process.env.PAYMENT_SECRET);
    // PAYMENT
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log(amount, "amount inside");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await cartCollection.deleteMany(query);
      res.send({ paymentResult, deleteResult });
    });

    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    // selller paymetn history
    // Get Payments for Seller Dashboard
    // Get Payments for Seller Dashboard
    const ObjectId = require("mongodb").ObjectId;
    app.get("/seller/dashboard", async (req, res) => {
      const sellerEmail = req.query.email;

      if (!sellerEmail) {
        return res.status(400).send({ error: "Seller email is required" });
      }

      // console.log("Fetching payments for seller email:", sellerEmail);

      try {
        const payments = await paymentCollection
          .aggregate([
            { $match: { status: { $exists: true } } },
            {
              $addFields: {
                menuIds: {
                  $map: {
                    input: "$menuIds",
                    as: "id",
                    in: { $toObjectId: "$$id" },
                  },
                },
              },
            },
            {
              $lookup: {
                from: "medicine",
                localField: "menuIds",
                foreignField: "_id",
                as: "medicines",
              },
            },
            { $unwind: "$medicines" },
            { $match: { "medicines.sellerEmail": sellerEmail } },
            {
              $project: {
                _id: 1,
                email: 1,
                transactionId: 1,
                price: 1,
                date: 1,
                status: 1,
                medicine: {
                  _id: "$medicines._id",
                  itemName: "$medicines.itemName",
                  genericName: "$medicines.genericName",
                  image: "$medicines.image",
                },
              },
            },
          ])
          .toArray();

        // console.log("Fetched payments:", payments);

        if (!payments || payments.length === 0) {
          return res.status(200).json([]);
        }

        payments.forEach((payment) => {
          payment._id = payment._id.toString();
          payment.medicine._id = payment.medicine._id.toString();
        });

        res.status(200).json(payments);
      } catch (error) {
        console.error("Error fetching seller dashboard data:", error);
        res
          .status(500)
          .send({ error: "Failed to fetch seller dashboard data" });
      }
    });

    app.get("/seller/revenue", async (req, res) => {
      const sellerEmail = req.query.email;

      if (!sellerEmail) {
        return res.status(400).send({ error: "Seller email is required" });
      }

      try {
        // Fetch revenue for the seller
        const revenueData = await paymentCollection
          .aggregate([
            // Step 1: Convert menuIds to ObjectId
            {
              $addFields: {
                menuIds: {
                  $map: {
                    input: "$menuIds", // The original menuIds (which are strings)
                    as: "menuId",
                    in: { $toObjectId: "$$menuId" }, // Convert them to ObjectId
                  },
                },
              },
            },
            // Step 2: Join with medicine collection
            {
              $lookup: {
                from: "medicine",
                localField: "menuIds", // Now menuIds are ObjectIds
                foreignField: "_id", // Match the medicine's _id
                as: "medicines",
              },
            },
            // Step 3: Filter by sellerEmail in medicines
            {
              $match: {
                "medicines.sellerEmail": sellerEmail,
              },
            },
            // Step 4: Debug log to see the documents after lookup
            {
              $project: {
                menuIds: 1,
                status: 1,
                price: 1,
                medicines: 1, // Add medicines to see if they are joined correctly
              },
            },
            // Step 5: Group by status and calculate totals
            {
              $group: {
                _id: null,
                paidTotal: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Paid"] }, "$price", 0],
                  },
                },
                pendingTotal: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "pending"] }, "$price", 0],
                  },
                },
              },
            },
          ])
          .toArray();

        // console.log("Revenue Data:", revenueData); // Log the result to see the structure

        // If no revenue data found
        if (!revenueData || revenueData.length === 0) {
          return res.status(200).json({ paid: 0, pending: 0 });
        }

        const revenue = revenueData[0];
        res.status(200).json({
          paid: revenue.paidTotal || 0,
          pending: revenue.pendingTotal || 0,
        });
      } catch (error) {
        console.error("Error fetching seller revenue:", error);
        res.status(500).send({ error: "Failed to fetch revenue" });
      }
    });

    // admin payment status
    app.get("/admin/revenue", async (req, res) => {
      try {
        // Aggregate total revenue
        const revenueData = await paymentCollection
          .aggregate([
            // Step 1: Group by status (Paid and Pending) and sum up the prices
            {
              $group: {
                _id: "$status", // Group by "Paid" and "Pending"
                totalAmount: { $sum: "$price" },
              },
            },
            // Step 2: Transform the grouped data into a simpler structure
            {
              $project: {
                _id: 0,
                status: "$_id", // Rename _id to status
                totalAmount: 1,
              },
            },
          ])
          .toArray();

        // Initialize totals
        let paidTotal = 0;
        let pendingTotal = 0;

        // Map the revenue data to paidTotal and pendingTotal
        revenueData.forEach((record) => {
          if (record.status === "Paid") {
            paidTotal = record.totalAmount;
          } else if (record.status === "pending") {
            pendingTotal = record.totalAmount;
          }
        });

        // Respond with the total revenue
        res.status(200).json({
          paid: paidTotal || 0,
          pending: pendingTotal || 0,
        });
      } catch (error) {
        console.error("Error fetching admin revenue:", error);
        res.status(500).send({ error: "Failed to fetch admin revenue" });
      }
    });

    // sales report admin

    app.get(
      "/admin/sales-report",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          let { startDate, endDate } = req.query;

          // Build the query filter for date range
          let filter = {};
          if (startDate && endDate) {
            filter.date = {
              $gte: new Date(startDate), // Convert startDate to Date object
              $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)), // Include the entire endDate
            };
          }

          // Aggregate sales data
          const salesReport = await paymentCollection
            .aggregate([
              {
                $match: filter, // Apply date filter if provided
              },
              {
                $addFields: {
                  menuIds: {
                    $map: {
                      input: "$menuIds", // Convert each menuId to ObjectId
                      as: "menuId",
                      in: { $toObjectId: "$$menuId" },
                    },
                  },
                },
              },
              {
                $lookup: {
                  from: "medicine", // Replace with your actual medicine collection name
                  localField: "menuIds",
                  foreignField: "_id",
                  as: "medicines",
                },
              },
              {
                $project: {
                  buyerEmail: "$email", // Buyer email from payment collection
                  transactionId: 1,
                  totalPrice: "$price",
                  date: 1,
                  status: 1,
                  medicines: {
                    itemName: 1,
                    sellerEmail: 1,
                    price: 1,
                  },
                },
              },
            ])
            .toArray();

          // Return the sales report
          res.status(200).json(salesReport);
        } catch (error) {
          console.error("Error fetching sales report:", error);
          res.status(500).send({ error: "Failed to fetch sales report" });
        }
      }
    );

    app.get("/getall", async (req, res) => {
      const data = await medicineCollection.find().toArray();
      res.send(data);
    });

    // Connect the client to the server	(optional starting in v4.7)

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
