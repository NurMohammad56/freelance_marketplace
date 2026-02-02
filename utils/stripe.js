import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Process a payment
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} - Payment intent
 */
export const processPayment = async ({
  amount,
  currency = "usd",
  paymentMethodId,
  customerId,
  description,
  metadata = {},
}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: paymentMethodId,
      customer: customerId,
      description,
      metadata,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error("Stripe payment error:", error);
    throw error;
  }
};

/**
 * Create a Stripe customer
 * @param {Object} customerData - Customer details
 * @returns {Promise<Object>} - Stripe customer
 */
export const createStripeCustomer = async ({ email, name, metadata = {} }) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    return customer;
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    throw error;
  }
};

/**
 * Create a payment intent
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} - Payment intent
 */
export const createPaymentIntent = async ({
  amount,
  currency = "usd",
  customerId,
  description,
  metadata = {},
}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      description,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
};

/**
 * Refund a payment
 * @param {String} paymentIntentId - Payment intent ID
 * @param {Number} amount - Amount to refund (optional, full refund if not provided)
 * @returns {Promise<Object>} - Refund object
 */
export const refundPayment = async (paymentIntentId, amount = null) => {
  try {
    const refundData = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundData.amount = amount;
    }

    const refund = await stripe.refunds.create(refundData);
    return refund;
  } catch (error) {
    console.error("Error refunding payment:", error);
    throw error;
  }
};

/**
 * Create a payout to creative
 * @param {Object} payoutData - Payout details
 * @returns {Promise<Object>} - Payout object
 */
export const createPayout = async ({
  amount,
  currency = "usd",
  destination,
  description,
  metadata = {},
}) => {
  try {
    const payout = await stripe.payouts.create({
      amount,
      currency,
      destination,
      description,
      metadata,
    });

    return payout;
  } catch (error) {
    console.error("Error creating payout:", error);
    throw error;
  }
};

/**
 * Retrieve payment intent
 * @param {String} paymentIntentId - Payment intent ID
 * @returns {Promise<Object>} - Payment intent
 */
export const retrievePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error("Error retrieving payment intent:", error);
    throw error;
  }
};

/**
 * Create a payment method
 * @param {Object} paymentMethodData - Payment method details
 * @returns {Promise<Object>} - Payment method
 */
export const createPaymentMethod = async ({ type, card }) => {
  try {
    const paymentMethod = await stripe.paymentMethods.create({
      type,
      card,
    });

    return paymentMethod;
  } catch (error) {
    console.error("Error creating payment method:", error);
    throw error;
  }
};

/**
 * Attach payment method to customer
 * @param {String} paymentMethodId - Payment method ID
 * @param {String} customerId - Customer ID
 * @returns {Promise<Object>} - Payment method
 */
export const attachPaymentMethod = async (paymentMethodId, customerId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return paymentMethod;
  } catch (error) {
    console.error("Error attaching payment method:", error);
    throw error;
  }
};

export default stripe;
