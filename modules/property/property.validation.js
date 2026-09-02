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
