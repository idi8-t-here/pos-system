require('dotenv').config();
const express = require("express");
const cors = require('cors');
const { resolve } = require("path");

const app = express();

// Enable CORS for requests from frontend (localhost:5173)
app.use(cors({ origin: "*" }));

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const createLocation = async () => {
  const location = await stripe.terminal.locations.create({
    display_name: "HQ",
    address: {
      line1: "1272 Valencia Street",
      city: "San Francisco",
      state: "CA",
      country: "US",
      postal_code: "94110",
    },
  });

  return location;
};

// The ConnectionToken's secret lets you connect to any Stripe Terminal reader
app.post("/connection_token", async (req, res) => {
  let connectionToken = await stripe.terminal.connectionTokens.create();
  res.json({ secret: connectionToken.secret });
});

app.post("/create_payment_intent", async (req, res) => {
  try {
    const intent = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: "usd",
      payment_method_types: ["card_present"],
      capture_method: "automatic",
    });
    res.json(intent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/capture_payment_intent", async (req, res) => {
  try {
    const intent = await stripe.paymentIntents.capture(req.body.payment_intent_id);
    res.json(intent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(4242, () => console.log("Node server listening on port 4242!"));
