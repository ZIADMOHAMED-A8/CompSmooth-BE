import { prisma } from "../../lib/prisma.ts";
import { AppError } from "../../utils/AppError.js";

function getFastApiBaseUrl() {
  const baseUrl =
    process.env.FAST_API_BACKEND_URL || process.env.fAST_API_BACKEND_URL;

  if (!baseUrl) {
    throw new AppError("FAST_API_BACKEND_URL is not configured.", 500);
  }

  return baseUrl.replace(/\/$/, "");
}

function getFastApiKey() {
  const apiKey = process.env.FAST_API_BACKEND_API_KEY;

  if (!apiKey) {
    throw new AppError("FAST_API_BACKEND_API_KEY is not configured.", 500);
  }

  return apiKey;
}

async function requestComps(input) {
  const response = await fetch(`${getFastApiBaseUrl()}/comps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getFastApiKey(),
    },
    body: JSON.stringify(input),
  });

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new AppError("FastAPI comps backend returned invalid JSON.", 502);
    }
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      `FastAPI comps backend failed with status ${response.status}.`;

    throw new AppError(message, 502);
  }

  return data;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function parseAddressParts(address) {
  const parts = address.split(",").map((part) => part.trim());
  const city = parts.at(-2);
  const stateZip = parts.at(-1) || "";
  const [state, zip] = stateZip.split(/\s+/);

  return {
    city,
    state,
    zip,
  };
}

function toNumber(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new AppError(
      `FastAPI comps response is missing valid property field: ${fieldName}.`,
      502
    );
  }

  return number;
}

function toString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(
      `FastAPI comps response is missing valid property field: ${fieldName}.`,
      502
    );
  }

  return value.trim();
}

function getSubjectProperty(compsResult) {
  return (
    compsResult?.subject ||
    compsResult?.subject_property ||
    compsResult?.subjectProperty ||
    compsResult?.property ||
    compsResult?.property_details ||
    compsResult?.propertyDetails ||
    compsResult
  );
}

function buildPropertyData(input, compsResult) {
  const property = getSubjectProperty(compsResult);
  const firstComp = Array.isArray(compsResult?.comps)
    ? compsResult.comps[0]
    : null;
  const addressParts = parseAddressParts(input.address);

  return {
    address: toString(
      firstDefined(property?.address, compsResult?.address, input.address),
      "address"
    ),
    city: toString(firstDefined(property?.city, addressParts.city), "city"),
    state: toString(firstDefined(property?.state, addressParts.state), "state"),
    zip: toString(
      firstDefined(property?.zip, property?.zip_code, addressParts.zip),
      "zip"
    ),
    latitude: toNumber(
      firstDefined(property?.latitude, property?.lat),
      "latitude"
    ),
    longitude: toNumber(
      firstDefined(property?.longitude, property?.lng, property?.lon),
      "longitude"
    ),
    beds: Math.round(toNumber(property?.beds, "beds")),
    baths: toNumber(property?.baths, "baths"),
    sqft: Math.round(toNumber(property?.sqft, "sqft")),
    year_bulit: Math.round(
      toNumber(
        firstDefined(property?.year_bulit, property?.year_built),
        "year_bulit"
      )
    ),
    property_type: toString(
      firstDefined(
        property?.property_type,
        property?.propertyType,
        property?.property_type_normalized,
        firstComp?.property_type,
        firstComp?.propertyType,
        firstComp?.property_type_normalized,
        firstComp?.style
      ),
      "property_type"
    ),
  };
}

export async function runComps(req, res) {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError("Authentication token is required.", 401);
  }

  const compsResult = await requestComps(req.body);
  const propertyData = buildPropertyData(req.body, compsResult);

  const [property] = await prisma.$transaction([
    prisma.properties.create({
      data: propertyData,
    }),
    prisma.usage_logs.create({
      data: {
        userId,
      },
    }),
  ]);

  res.status(201).json({
    success: true,
    data: {
      property,
      comps: compsResult,
    },
  });
}
