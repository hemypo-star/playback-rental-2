

-- Create a file link between products table and storage
CREATE OR REPLACE FUNCTION public.handle_storage_image_path()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.imageurl IS NOT NULL THEN
    -- Only add metadata if the imageurl is not an external URL
    IF NOT NEW.imageurl ~ '^https?://' THEN
      -- Add metadata to storage object
      UPDATE storage.objects
      SET metadata = jsonb_build_object('product_id', NEW.id)
      WHERE name = NEW.imageurl AND bucket_id = 'products';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create a trigger to automatically update image metadata
DROP TRIGGER IF EXISTS link_product_image ON public.products;

CREATE TRIGGER link_product_image
AFTER INSERT OR UPDATE OF imageurl ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.handle_storage_image_path();

