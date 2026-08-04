import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "BioLIMS API",
    version: "1.0.0",
    description:
      "Org-scoped REST API. Authenticate with `Authorization: Bearer <api key>` — create keys in Settings → API keys.",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      apiKey: { type: "http", scheme: "bearer", bearerFormat: "lk_…" },
    },
    schemas: {
      Entity: {
        type: "object",
        properties: {
          id: { type: "string" },
          display_id: { type: "string", example: "SMP-000123" },
          type: { type: "string", example: "sample" },
          name: { type: "string" },
          status: { type: "string" },
          data: { type: "object", additionalProperties: true },
          location_id: { type: ["string", "null"] },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          fieldErrors: { type: "object", additionalProperties: { type: "string" } },
        },
      },
    },
  },
  security: [{ apiKey: [] }],
  paths: {
    "/entities": {
      get: {
        summary: "List records",
        parameters: [
          { name: "type", in: "query", schema: { type: "string" }, description: "Entity type slug" },
          { name: "q", in: "query", schema: { type: "string" }, description: "Search name or ID" },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "location_id", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 100, maximum: 500 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          200: {
            description: "Matching records",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Entity" } },
                  },
                },
              },
            },
          },
          401: { description: "Missing or invalid API key" },
        },
      },
      post: {
        summary: "Register a record",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "name"],
                properties: {
                  type: { type: "string", description: "Entity type slug" },
                  name: { type: "string" },
                  status: { type: "string" },
                  data: { type: "object", additionalProperties: true },
                  location_id: { type: "string" },
                  parent_id: { type: "string", description: "Derive from an existing record" },
                  quantity: { type: "string" },
                  unit: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Entity" } } },
          },
          400: {
            description: "Validation failed",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/entities/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Internal id or display id (e.g. SMP-000123)",
        },
      ],
      get: {
        summary: "Fetch one record",
        responses: {
          200: {
            description: "The record",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Entity" } } },
          },
          404: { description: "Not found" },
        },
      },
      patch: {
        summary: "Update a record",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  status: { type: "string" },
                  data: { type: "object", additionalProperties: true },
                  location_id: { type: ["string", "null"] },
                  position_row: { type: ["integer", "null"] },
                  position_col: { type: ["integer", "null"] },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: { summary: "Archive a record", responses: { 204: { description: "Archived" } } },
    },
    "/entity-types": {
      get: { summary: "List record types", responses: { 200: { description: "Record types" } } },
      post: {
        summary: "Create a record type",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  prefix: { type: "string" },
                  color: { type: "string" },
                  is_inventory: { type: "boolean" },
                  fields: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/locations": {
      get: { summary: "List storage locations", responses: { 200: { description: "Locations" } } },
      post: {
        summary: "Create a storage location",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "kind"],
                properties: {
                  name: { type: "string" },
                  kind: { type: "string", enum: ["site", "room", "freezer", "shelf", "rack", "box"] },
                  parent_id: { type: "string" },
                  grid_rows: { type: "integer" },
                  grid_cols: { type: "integer" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
  },
} as const;

export function GET() {
  return NextResponse.json(spec);
}
