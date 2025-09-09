import { Document, Schema, model, Types } from "mongoose";

export type ResourceType =
  | "pdf"
  | "zip"
  | "link"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "other";

export interface Resource {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  url: string;
  type: ResourceType;

  // File properties
  fileName?: string;
  fileSize?: number; // in bytes
  mimeType?: string;

  // Access control
  downloadable: boolean;
  isPublic: boolean; // can be accessed without enrollment

  // Associations
  course?: Types.ObjectId;
  module?: Types.ObjectId;
  content?: Types.ObjectId;

  // Organization
  order?: number;
  tags: string[];
  category?: string;

  // Download tracking
  downloadCount: number;

  // Status
  isActive: boolean;

  // Created by
  createdBy: Types.ObjectId;
}

export interface IResource extends Document {
  title: string;
  description?: string;
  url: string;
  type: ResourceType;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  downloadable: boolean;
  isPublic: boolean;
  course?: Types.ObjectId;
  module?: Types.ObjectId;
  content?: Types.ObjectId;
  order?: number;
  tags: string[];
  category?: string;
  downloadCount: number;
  isActive: boolean;
  createdBy: Types.ObjectId;

  // Methods
  incrementDownloadCount(): Promise<IResource>;
  getFormattedFileSize(): string;
}

const ResourceSchema = new Schema<IResource>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    url: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        "pdf",
        "zip",
        "link",
        "image",
        "video",
        "audio",
        "document",
        "other",
      ],
      default: "link",
    },

    // File properties
    fileName: { type: String, trim: true },
    fileSize: { type: Number, min: 0 },
    mimeType: { type: String },

    // Access control
    downloadable: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false },

    // Associations
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    module: {
      type: Schema.Types.ObjectId,
      ref: "Module",
      index: true,
    },
    content: {
      type: Schema.Types.ObjectId,
      ref: "Content",
      index: true,
    },

    // Organization
    order: { type: Number, default: 0 },
    tags: [{ type: String, lowercase: true, trim: true }],
    category: { type: String, trim: true },

    // Download tracking
    downloadCount: { type: Number, default: 0, min: 0 },

    // Status
    isActive: { type: Boolean, default: true },

    // Created by
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ResourceSchema.index({ course: 1, order: 1 });
ResourceSchema.index({ module: 1, order: 1 });
ResourceSchema.index({ content: 1, order: 1 });
ResourceSchema.index({ type: 1 });
ResourceSchema.index({ tags: 1 });
ResourceSchema.index({ isActive: 1, isPublic: 1 });

// Text search
ResourceSchema.index({
  title: "text",
  description: "text",
  tags: "text",
});

// Virtual for file type icon
ResourceSchema.virtual("icon").get(function (this: IResource) {
  const iconMap: Record<ResourceType, string> = {
    pdf: "📄",
    zip: "📦",
    link: "🔗",
    image: "🖼️",
    video: "🎥",
    audio: "🎵",
    document: "📝",
    other: "📎",
  };
  return iconMap[this.type] || "📎";
});

// Virtual for URL type
ResourceSchema.virtual("isExternalLink").get(function (this: IResource) {
  return this.url.startsWith("http://") || this.url.startsWith("https://");
});

// Methods
ResourceSchema.methods.incrementDownloadCount = function (this: IResource) {
  this.downloadCount += 1;
  return this.save();
};

ResourceSchema.methods.getFormattedFileSize = function (this: IResource) {
  if (!this.fileSize) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let size = this.fileSize;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// Pre-save middleware
ResourceSchema.pre("save", function (next) {
  // Extract file name from URL if not provided
  if (!this.fileName && this.url) {
    const urlParts = this.url.split("/");
    this.fileName = urlParts[urlParts.length - 1] || "resource";
  }

  next();
});

export const Resource = model<IResource>("Resource", ResourceSchema);
