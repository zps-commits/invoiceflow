import { useId, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { LIMITS } from '@/domain/validation/limits';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'] as const;

/**
 * The logo.
 *
 * Read in the browser and kept as a data URL next to the document. It is
 * never uploaded anywhere, which is the whole privacy story of this
 * application in one field.
 *
 * SVG is deliberately not accepted. An SVG is a document that can carry
 * script, and this one gets embedded in a page and handed to a PDF
 * renderer; a raster format cannot do anything but be an image.
 */
export default function LogoField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  async function accept(file: File | undefined) {
    setError(null);
    if (!file) return;

    if (!(ACCEPTED as readonly string[]).includes(file.type)) {
      setError('Use a PNG, JPEG or WebP image.');
      return;
    }
    if (file.size > LIMITS.maxLogoBytes) {
      setError(`That image is larger than ${Math.round(LIMITS.maxLogoBytes / 1024)} KB.`);
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('unreadable'));
        reader.readAsDataURL(file);
      });
      // A file can claim a type it is not, so the decode is the real check.
      await new Promise<void>((resolve, reject) => {
        const probe = new Image();
        probe.onload = () => resolve();
        probe.onerror = () => reject(new Error('not an image'));
        probe.src = dataUrl;
      });
      onChange(dataUrl);
    } catch {
      setError('That file could not be read as an image.');
    }
  }

  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-xs font-medium text-muted">Logo</span>

      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="Your logo, as it will appear" className="max-h-12 w-auto rounded border border-line" />
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setError(null);
            }}
            className="btn-quiet pressable inline-flex items-center gap-1.5 py-1.5 text-xs"
          >
            <X aria-hidden="true" className="size-3.5" />
            Remove logo
          </button>
        </div>
      ) : (
        <>
          <label
            htmlFor={id}
            className="btn-quiet pressable inline-flex cursor-pointer items-center gap-2 text-xs"
          >
            <Upload aria-hidden="true" className="size-4" />
            Choose an image
          </label>
          <input
            id={id}
            type="file"
            accept={ACCEPTED.join(',')}
            className="sr-only"
            onChange={(e) => void accept(e.target.files?.[0])}
          />
        </>
      )}

      <p className="mt-1.5 text-xs leading-snug text-muted">
        PNG, JPEG or WebP, up to {Math.round(LIMITS.maxLogoBytes / 1024)} KB. It stays in this
        browser and is never uploaded.
      </p>

      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
