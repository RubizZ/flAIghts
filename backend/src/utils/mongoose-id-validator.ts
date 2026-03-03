import mongoose, { Schema, Document } from 'mongoose';

export default function idValidator(schema: Schema, options?: { message?: string }) {
    const defaultMessage = options?.message || "El valor '{VALUE}' de {PATH} no es un ID válido de {REF}";

    Object.keys(schema.paths).forEach((pathname) => {
        const schemaType: any = schema.paths[pathname];

        let targetSchemaType = schemaType;
        let ref = schemaType.options?.ref;
        let refField = schemaType.options?.refField; // Campo referenciado personalizado

        if (!ref && schemaType.$isMongooseArray) {
            if (schemaType.caster && schemaType.caster.options && schemaType.caster.options.ref) {
                ref = schemaType.caster.options.ref;
                targetSchemaType = schemaType.caster;
                refField = schemaType.caster.options.refField;
            } else if (Array.isArray(schemaType.options?.type) && schemaType.options.type[0]?.ref) {
                ref = schemaType.options.type[0].ref;
                refField = schemaType.options.type[0].refField;
            }
        }

        if (ref) {
            targetSchemaType.validate({
                validator: async function (this: Document, value: any) {
                    if (value === null || value === undefined || value === '') return true;

                    const modelName = typeof ref === 'function' ? ref.call(this) : ref;

                    let targetModel;
                    try {
                        targetModel = mongoose.model(modelName);
                    } catch (err) {
                        try {
                            const path = await import('node:path');
                            const fs = await import('node:fs');
                            const { fileURLToPath } = await import('node:url');

                            const __filename = fileURLToPath(import.meta.url);
                            const __dirname = path.dirname(__filename);
                            const modulesDir = path.join(__dirname, '../modules');

                            const findModelFile = (dir: string, modelToFind: string): string | null => {
                                const files = fs.readdirSync(dir);
                                for (const file of files) {
                                    const fullPath = path.join(dir, file);
                                    if (fs.statSync(fullPath).isDirectory()) {
                                        const res = findModelFile(fullPath, modelToFind);
                                        if (res) return res;
                                    } else if (file === `${modelToFind.toLowerCase()}.model.ts` || file === `${modelToFind.toLowerCase()}.model.js`) {
                                        return fullPath;
                                    }
                                }
                                return null;
                            };

                            const modelPath = findModelFile(modulesDir, modelName);
                            if (modelPath) {
                                const fileUri = 'file:///' + modelPath.replace(/\\/g, '/');
                                await import(fileUri);
                                targetModel = mongoose.model(modelName);
                            } else {
                                throw new Error(`Model file for ${modelName} not found in modules folder.`);
                            }
                        } catch (loadErr) {
                            console.error(`[idValidator] Missing model ${modelName} could not be loaded dynamically. Skipping validation.`, loadErr);
                            return true;
                        }
                    }

                    const validateSingle = async (val: any) => {
                        if (val === null || val === undefined || val === '') return true;
                        try {
                            const idVal = val._id || val;
                            const checkQuery = refField
                                ? { [refField]: idVal }
                                : { _id: idVal };

                            const doc = await targetModel.findOne(checkQuery).select('_id').lean().exec();
                            return !!doc;
                        } catch (e) {
                            console.error(`[idValidator] validateSingle error for ${val}:`, e);
                            return false;
                        }
                    };

                    if (Array.isArray(value)) {
                        for (const val of value) {
                            const isValid = await validateSingle(val);
                            if (!isValid) return false;
                        }
                        return true;
                    }

                    return await validateSingle(value);
                },
                message: defaultMessage.replace('{REF}', typeof ref === 'function' ? 'la referencia' : ref)
            });
        }
    });
}
