
import { toLowerCase } from "zod";
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
      throw new AppError(
        "FastAPI comps backend returned invalid JSON.",
        502
      );
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
      `FastAPI comps response is missing valid field: ${fieldName}.`,
      502
    );
  }

  return number;
}

function toString(value, fieldName) {
  if (value === null || value === undefined) {
    throw new AppError(
      `FastAPI comps response is missing valid field: ${fieldName}.`,
      502
    );
  }

  const string = String(value).trim();

  if (string.length === 0) {
    throw new AppError(
      `FastAPI comps response is missing valid field: ${fieldName}.`,
      502
    );
  }

  return string;
}

function getRequiredObject(value, fieldName) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new AppError(
      `FastAPI comps response is missing valid field: ${fieldName}.`,
      502
    );
  }

  return value;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function unwrapCompsResult(compsResult) {
  const result = getRequiredObject(compsResult, "response");

  if (result.subject) {
    return result;
  }

  if (result.data?.comps?.subject) {
    return result.data.comps;
  }

  if (result.data?.subject) {
    return result.data;
  }

  return result;
}

function buildPropertyData(input, compsResult) {
  const result = unwrapCompsResult(compsResult);
  const property = getRequiredObject(result.subject, "subject");
  const deal = getRequiredObject(result.deal, "deal");
  const address = toString(
    result.address ?? input.address,
    "address"
  );
  const addressParts = parseAddressParts(address);
  const mao = firstDefined(
    deal.mao,
    result.mao,
    deal.arv_70,
    result.arv_70
  );

  return {
    propertyId: toString(
      property.property_id,
      "property_id"
    ),

    address,

    city: toString(
      addressParts.city,
      "city"
    ),

    state: toString(
      addressParts.state,
      "state"
    ),

    zip: toString(
      addressParts.zip,
      "zip"
    ),

    latitude: toNumber(
      property.latitude,
      "latitude"
    ),

    longitude: toNumber(
      property.longitude,
      "longitude"
    ),

    beds: Math.round(
      toNumber(property.beds, "beds")
    ),

    baths: toNumber(
      property.baths,
      "baths"
    ),

    sqft: Math.round(
      toNumber(property.sqft, "sqft")
    ),

    year_bulit: Math.round(
      toNumber(property.year_built, "year_built")
    ),

    mao: Math.round(toNumber(mao, "deal.mao")),

    property_type: "single_family",
  };
}

export async function runComps(req, res) {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError(
      "Authentication token is required.",
      401
    );
  }
  const compsResult = await requestComps(req.body);

  const propertyData = buildPropertyData(
    req.body,
    compsResult
  );

  const property = await prisma.$transaction(async (tx) => {
    const property = await tx.properties.upsert({
      where: {
        propertyId_provider: {
          propertyId: propertyData.propertyId,
          provider: propertyData.provider ?? "REALTOR",
        },
      },
      update: {
        mao: propertyData.mao,
      },
      create: propertyData,
    });

    await tx.usage_logs.create({
      data: {
        userId,
      },
    });

    await tx.userProperties.upsert({
      where: {
        userId_propertyId: {
          userId,
          propertyId: property.id,
        },
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        userId,
        propertyId: property.id,
      },
    });

    return property;
  });

  res.status(201).json({
    success: true,
    data: {
      property,
      comps: compsResult,
    },
  });
}

export async function getProperties(req, res) {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError("Authentication token is required.", 401);
  }

  const { page, limit } = req.query;
  const where = { userId };

  const [userProperties, total] = await prisma.$transaction([
    prisma.userProperties.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        property: {
          select: {
            mao: true,
            address: true,
            beds: true,
            baths: true,
          },
        },
      },
    }),
    prisma.userProperties.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    data: {
      properties: userProperties.map((userProperty) => userProperty.property),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    },
  });
}
