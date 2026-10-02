import { z } from "zod";

const moneySchema = z.coerce
  .number()
  .finite()
  .nonnegative("Cost values must be zero or greater.");

export const runCompsSchema = z.object({
  body: z.object({
    address: z.string().trim().min(1, "Address is required."),
    repairs: moneySchema,
    buying_costs: moneySchema,
    holding_costs: moneySchema,
    selling_costs: moneySchema,
    desired_profit: moneySchema,
  }),
});

export const getPropertiesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
