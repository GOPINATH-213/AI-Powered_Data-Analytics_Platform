import { IRelationshipMetadata } from '../models/DatasetMetadata';
import { datasetRepository } from '../repositories/DatasetRepository';
import { datasetMetadataRepository } from '../repositories/DatasetMetadataRepository';
import { Types } from 'mongoose';

export class RelationshipDetectionService {
  /**
   * Scans other active datasets for overlapping columns and potential relationships.
   */
  async detectRelationships(
    currentDatasetId: Types.ObjectId,
    currentColumns: string[],
    userId: string
  ): Promise<{ relationships: IRelationshipMetadata[]; logs: string[] }> {
    const logs: string[] = [];
    const relationships: IRelationshipMetadata[] = [];

    logs.push('Scanning other datasets for relational candidates.');

    try {
      // Find all datasets owned by this user (except current one)
      const otherSets = await datasetRepository.find({
        userId,
        _id: { $ne: currentDatasetId },
      });

      for (const other of otherSets.items) {
        // Fetch metadata for the other dataset
        const meta = await datasetMetadataRepository.findLatestByDatasetId(other._id);
        if (!meta) continue;

        const otherCols = meta.detectedColumns.map((c) => c.name);

        // Find intersecting keys
        const intersections = currentColumns.filter((c) => 
          otherCols.includes(c) && 
          (c.toLowerCase().endsWith('id') || c.toLowerCase().endsWith('key'))
        );

        intersections.forEach((col) => {
          relationships.push({
            sourceColumn: col,
            targetDatasetId: other._id as Types.ObjectId,
            targetColumn: col,
            confidence: 0.85, // Common primary key names indicate high confidence relation
          });
          logs.push(`Detected relationship candidate: column "${col}" maps to dataset "${other.datasetName}".`);
        });
      }
    } catch (err) {
      logs.push(`Relationship detection bypassed: ${(err as Error).message}`);
    }

    if (relationships.length === 0) {
      logs.push('No obvious relational variables detected between datasets.');
    }

    return { relationships, logs };
  }
}

export const relationshipDetectionService = new RelationshipDetectionService();
export default relationshipDetectionService;
