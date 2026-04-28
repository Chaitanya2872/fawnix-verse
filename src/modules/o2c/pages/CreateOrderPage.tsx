import { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { FormInput } from "../components/FormInput";
import { formatCurrency } from "../utils/format";
import { seedProducts } from "../utils/seed";
import { useOrders } from "../hooks/useOrders";
import type { CreateOrderPayload } from "../types";

const orderItemSchema = z.object({
  product_id: z.number().min(1, "Select a product."),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  price: z.number().min(0.01, "Enter a price."),
});

const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(2, "Customer name is required."),
    email: z.string().email("Enter a valid email."),
    phone: z.string().min(7, "Enter a valid phone number."),
    address: z.string().min(5, "Enter a valid address."),
  }),
  items: z.array(orderItemSchema).min(1, "Add at least one line item."),
});

type CreateOrderFormValues = z.infer<typeof orderSchema>;

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const { createNewOrder, isLoading } = useOrders();
  const defaultProduct = seedProducts[0];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateOrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer: {
        name: "",
        email: "",
        phone: "",
        address: "",
      },
      items: [
        {
          product_id: defaultProduct?.id ?? 0,
          quantity: 1,
          price: defaultProduct?.price ?? 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const items = watch("items");

  const orderTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  async function onSubmit(values: CreateOrderFormValues) {
    const customerId = Date.now();
    const payload: CreateOrderPayload = {
      customer: {
        id: customerId,
        ...values.customer,
      },
      items: values.items,
    };

    const created = await createNewOrder(payload);
    if (created) {
      navigate(`/orders/${created.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Create Order</h2>
          <p className="text-sm text-slate-500">Capture customer details and line items.</p>
        </div>
        <NavLink
          to="/orders"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Back to orders
        </NavLink>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700">Customer Details</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Customer Name"
              name="customer.name"
              register={register}
              error={errors.customer?.name}
              placeholder="Nimbus Medical"
              required
            />
            <FormInput
              label="Email"
              name="customer.email"
              register={register}
              error={errors.customer?.email}
              placeholder="ops@nimbusmed.com"
              required
            />
            <FormInput
              label="Phone"
              name="customer.phone"
              register={register}
              error={errors.customer?.phone}
              placeholder="+1 555 000 0000"
              required
            />
            <FormInput
              label="Address"
              name="customer.address"
              register={register}
              error={errors.customer?.address}
              placeholder="Street, City, State"
              required
              multiline
              className="sm:col-span-2"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Order Summary</h3>
          <p className="mt-2 text-sm text-slate-500">Total amount</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {formatCurrency(orderTotal)}
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Submitting..." : "Create Order"}
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Line Items</h3>
              <p className="text-xs text-slate-500">Add products and quantities.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                append({
                  product_id: seedProducts[0]?.id ?? 0,
                  quantity: 1,
                  price: seedProducts[0]?.price ?? 0,
                })
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {fields.map((field, index) => {
              const productRegister = register(`items.${index}.product_id`, {
                valueAsNumber: true,
              });

              return (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-12"
                >
                  <div className="md:col-span-4">
                    <label className="text-xs font-semibold text-slate-600">Product</label>
                    <select
                      {...productRegister}
                      onChange={(event) => {
                        productRegister.onChange(event);
                        const nextId = Number(event.target.value);
                        const product = seedProducts.find((item) => item.id === nextId);
                        setValue(`items.${index}.price`, product?.price ?? 0, {
                          shouldValidate: true,
                        });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {seedProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                    {errors.items?.[index]?.product_id ? (
                      <p className="mt-1 text-xs text-rose-500">
                        {errors.items[index]?.product_id?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-600">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    {errors.items?.[index]?.quantity ? (
                      <p className="mt-1 text-xs text-rose-500">
                        {errors.items[index]?.quantity?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-xs font-semibold text-slate-600">Price</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      {...register(`items.${index}.price`, { valueAsNumber: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    {errors.items?.[index]?.price ? (
                      <p className="mt-1 text-xs text-rose-500">
                        {errors.items[index]?.price?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-end justify-between gap-3 md:col-span-3">
                    <div>
                      <p className="text-xs text-slate-500">Line total</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(items[index]?.price * items[index]?.quantity)}
                      </p>
                    </div>
                    {fields.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </div>
  );
}
