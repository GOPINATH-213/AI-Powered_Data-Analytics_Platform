import { Types } from 'mongoose';
import { ValidationError } from './errors';

/**
 * Normalizes any identifier parameter into a valid Mongoose Types.ObjectId.
 * Extracts _id automatically if a populated document or plain object is passed.
 * Throws a clean ValidationError instead of MongoDB CastError if validation fails.
 */
export function normalizeObjectId(id: any, paramName = 'id'): Types.ObjectId {
  console.log(`[DEBUG LOG] normalizeObjectId() called for ${paramName}: typeof = ${typeof id}, value =`, id);

  if (!id) {
    throw new ValidationError(`Parameter '${paramName}' is required and must be a valid ObjectId.`);
  }

  // 1. If it's already a Mongoose Types.ObjectId
  if (id instanceof Types.ObjectId) {
    return id;
  }

  // 2. If it's a model/document or populated object
  if (typeof id === 'object') {
    if (id._id) {
      if (id._id instanceof Types.ObjectId) {
        return id._id;
      }
      return normalizeObjectId(id._id, `${paramName}._id`);
    }
    if (id.id) {
      return normalizeObjectId(id.id, `${paramName}.id`);
    }
  }

  // 3. If it's a string representation of an object
  const str = String(id).trim();
  if (str.includes('_id') || str.includes('{')) {
    const match = str.match(/ObjectId\(['"]([a-f0-9]{24})['"]\)/i) || 
                  str.match(/_id:\s*['"]?([a-f0-9]{24})['"]?/i) ||
                  str.match(/['"]?_id['"]?:\s*['"]?([a-f0-9]{24})['"]?/i);
    if (match && match[1]) {
      console.log(`[DEBUG LOG] Extracted hex ${match[1]} from stringified object structure.`);
      return new Types.ObjectId(match[1]);
    }
  }

  // 4. Validate if it's a valid 24-character hexadecimal string
  if (/^[a-f0-9]{24}$/i.test(str)) {
    return new Types.ObjectId(str);
  }

  throw new ValidationError(`Expected a valid MongoDB ObjectId for '${paramName}', but received invalid value: ${JSON.stringify(id)}`);
}
