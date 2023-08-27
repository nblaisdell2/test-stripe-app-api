import { Request, Response, NextFunction } from "express";
import { execute } from "../utils/sql";

import { Stripe } from "stripe";
import { buffer } from "stream/consumers";

import { config } from "dotenv";
config();

const stripe = new Stripe(process.env.STRIPE_API_SECRET_KEY as string, {
  apiVersion: "2022-11-15",
});

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

export const webhook = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"] as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.log(`Webhook Error: ${err}`);
    res.status(400).send(`Webhook Error: ${err}`);
    return;
  }

  // Handle the event
  console.log("INCOMING EVENT: ", event.type);

  switch (event.type) {
    case "customer.created": {
      const customerCreatedData: any = event.data.object;
      console.log(customerCreatedData);

      await execute(req, "sp_UpdateStripeCustomerID", [
        { name: "UserEmail", value: customerCreatedData?.email },
        { name: "StripeCustomerID", value: customerCreatedData?.id },
      ]);
      break;
    }
    case "customer.subscription.deleted": {
      const SubscriptionDeleted: any = event.data.object;
      console.log(SubscriptionDeleted);

      await execute(req, "sp_UpdateSubscription", [
        { name: "StripeCustomerID", value: SubscriptionDeleted?.customer },
        { name: "SubscriptionID", value: SubscriptionDeleted?.id },
        { name: "NewStatus", value: "Inactive" },
        { name: "IsInTrial", value: false },
        { name: "SubStartDate", value: null },
        { name: "SubEndDate", value: null },
      ]);

      break;
    }
    case "customer.subscription.updated": {
      const SubscriptionUpdated: any = event.data.object;
      console.log(SubscriptionUpdated);

      await execute(req, "sp_UpdateSubscription", [
        { name: "StripeCustomerID", value: SubscriptionUpdated?.customer },
        { name: "SubscriptionID", value: SubscriptionUpdated?.id },
        { name: "NewStatus", value: "Active" },
        { name: "IsInTrial", value: true },
        {
          name: "SubStartDate",
          value: new Date(
            SubscriptionUpdated?.current_period_start * 1000
          ).toISOString(),
        },
        {
          name: "SubEndDate",
          value: new Date(
            SubscriptionUpdated?.current_period_end * 1000
          ).toISOString(),
        },
      ]);

      break;
    }
    default:
    //   console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
};
