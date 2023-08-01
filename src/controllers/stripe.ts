import { Request, Response, NextFunction } from "express";
import { Stripe } from "stripe";
import { buffer } from "stream/consumers";

import { config } from "dotenv";
config();

const stripe = new Stripe(process.env.STRIPE_API_SECRET_KEY as string, {
  apiVersion: "2022-11-15",
});

import sql from "mssql";
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST as string,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false, // for azure
    trustServerCertificate: true, // change to true for local dev / self-signed certs
  },
};

type Highlight = {
  isHighlighted: boolean;
  highlightText: string;
};

type Price = {
  amount: number;
  frequency: string;
};

type Product = {
  name: string;
  description: string;
  price: Price;
};

type SubItem = {
  highlight: Highlight;
  isTestMode: boolean;
  product: Product;
  buttonText: string;
};

export const getSubscriptions = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { id, default_price, description, livemode, name } =
    await stripe.products.retrieve(
      process.env.STRIPE_SUBSCRIPTION_PRODUCT_ID as string
    );

  const prices = await stripe.prices.list({ product: id });

  const subItems: SubItem[] = prices.data.map((price) => {
    const item: SubItem = {
      isTestMode: !livemode,
      buttonText: "Start Trial",
      highlight: {
        isHighlighted: price.id == default_price,
        highlightText: "Best Deal",
      },
      product: {
        name: name,
        description: description || "",
        price: {
          amount: (price?.unit_amount || 0) / 100,
          frequency: price?.recurring?.interval || "",
        },
      },
    };
    return item;
  });

  res.status(200).json({ items: subItems });
};

export const createCheckoutSession = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { stripeCustomerID, userEmail, subFrequency, subPrice } = req.body;

  const prices = await stripe.prices.list({
    product: process.env.STRIPE_SUBSCRIPTION_PRODUCT_ID as string,
  });
  const price = prices.data.find((p) => {
    return (
      p?.recurring?.interval == subFrequency &&
      (p?.unit_amount || 0) / 100 == subPrice
    );
  });
  const baseUrl = process.env.BASE_CLIENT_URL as string;
  const session = await stripe.checkout.sessions.create({
    billing_address_collection: "auto",
    // customer: stripeCustomerID,
    line_items: [
      {
        price: price?.id, //"price_1NZeJZIJJf7l1lt3pVyddkwt",//
        // For metered billing, do not pass quantity
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: baseUrl,
    cancel_url: baseUrl,
  });

  res.status(200).json({ sessionURL: session.url as string });
};

export const createPortalSession = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { StripeCustomerID } = req.body;
  console.log("Got customer ID:", StripeCustomerID);

  // This is the url to which the customer will be redirected when they are done
  // managing their billing with the portal.
  const returnUrl = process.env.BASE_CLIENT_URL;
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: StripeCustomerID,
    return_url: returnUrl,
  });

  res.status(200).json({ sessionURL: portalSession.url });
};

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export const webhook = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"] as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook Error: ${err}`);
    res.status(400).send(`Webhook Error: ${err}`);
    return;
  }

  // Handle the event
  console.log("INCOMING EVENT: ", event.type);

  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntentSucceeded = event.data.object;
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    case "customer.created": {
      const customerCreatedData: any = event.data.object;
      console.log(customerCreatedData);

      let pool = await sql.connect(sqlConfig);
      let result2 = await pool
        .request()
        .input("UserEmail", sql.VarChar(255), customerCreatedData?.email)
        .input("StripeCustomerID", sql.VarChar(255), customerCreatedData?.id)

        .execute("sp_UpdateStripeCustomerID");

      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    }
    case "payment_method.attached":
      const paymentMethodAttached = event.data.object;
      console.log(paymentMethodAttached);
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    // case "customer.subscription.created": {
    //   const SubscriptionCreated: any = event.data.object;
    //   console.log(SubscriptionCreated);

    //   let pool = await sql.connect(sqlConfig);
    //   let result2 = await pool
    //     .request()
    //     .input(
    //       "StripeCustomerID",
    //       sql.VarChar(255),
    //       SubscriptionCreated?.customer
    //     )
    //     .input("SubscriptionID", sql.VarChar(255), SubscriptionCreated?.id)
    //     .input("NewStatus", sql.VarChar(255), "Active")
    //     .input("IsInTrial", sql.Bit, true)
    //     .input(
    //       "SubStartDate",
    //       sql.VarChar(255),
    //       new Date(
    //         SubscriptionCreated?.current_period_start * 1000
    //       ).toISOString()
    //     )
    //     .input(
    //       "SubEndDate",
    //       sql.VarChar(255),
    //       new Date(SubscriptionCreated?.current_period_end * 1000).toISOString()
    //     )
    //     .execute("sp_UpdateSubscription");
    //   // Then define and call a function to handle the event payment_intent.succeeded
    //   break;
    // }
    case "customer.subscription.deleted": {
      const SubscriptionDeleted: any = event.data.object;
      console.log(SubscriptionDeleted);

      let pool = await sql.connect(sqlConfig);
      let result2 = await pool
        .request()
        .input(
          "StripeCustomerID",
          sql.VarChar(255),
          SubscriptionDeleted?.customer
        )
        .input("SubscriptionID", sql.VarChar(255), SubscriptionDeleted?.id)
        .input("NewStatus", sql.VarChar(255), "Inactive")
        .input("IsInTrial", sql.Bit, false)
        .input("SubStartDate", sql.VarChar(255), null)
        .input("SubEndDate", sql.VarChar(255), null)
        .execute("sp_UpdateSubscription");

      break;
    }
    case "customer.subscription.updated": {
      const SubscriptionUpdated: any = event.data.object;
      console.log(SubscriptionUpdated);

      let pool = await sql.connect(sqlConfig);
      let result2 = await pool
        .request()
        .input(
          "StripeCustomerID",
          sql.VarChar(255),
          SubscriptionUpdated?.customer
        )
        .input("SubscriptionID", sql.VarChar(255), SubscriptionUpdated?.id)
        .input("NewStatus", sql.VarChar(255), "Active")
        .input("IsInTrial", sql.Bit, true)
        .input(
          "SubStartDate",
          sql.VarChar(255),
          new Date(
            SubscriptionUpdated?.current_period_start * 1000
          ).toISOString()
        )
        .input(
          "SubEndDate",
          sql.VarChar(255),
          new Date(SubscriptionUpdated?.current_period_end * 1000).toISOString()
        )
        .execute("sp_UpdateSubscription");
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    }
    // ... handle other event types
    default:
    //   console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
};
