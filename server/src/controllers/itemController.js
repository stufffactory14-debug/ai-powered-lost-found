const Item = require("../models/Item");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

function uploadImage(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "lost-and-found" },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result.secure_url);
      },
    );

    stream.end(buffer);
  });
}

function hasRequiredFields(...fields) {
  return fields.every((field) => typeof field === "string" && field.trim());
}

async function createItem(req, res) {
  const {
    title,
    description,
    category,
    type,
    location,
    verificationQuestion,
  } = req.body || {};

  if (!hasRequiredFields(title, description, category, type, location)) {
    return res.status(400).json({
      success: false,
      message: "Title, description, category, type, and location are required.",
    });
  }

  if (!Item.schema.path("type").enumValues.includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Type must be LOST or FOUND.",
    });
  }

  try {
    let imageUrl;

    if (req.file) {
      if (!isCloudinaryConfigured()) {
        return res.status(500).json({
          success: false,
          message: "Image upload service is not configured.",
        });
      }

      imageUrl = await uploadImage(req.file.buffer);
    }

    const item = await Item.create({
      title,
      description,
      category,
      type,
      location,
      verificationQuestion,
      imageUrl,
      userId: req.userId,
    });

    return res.status(201).json({ success: true, item });
  } catch (error) {
    console.error("Item creation failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create item.",
    });
  }
}

module.exports = { createItem };
