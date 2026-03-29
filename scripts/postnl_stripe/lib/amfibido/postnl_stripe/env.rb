require "dotenv/load"

module Amfibido
  module PostnlStripe
    class Env
      attr_reader :stripe_secret_key,
                  :stripe_page_size,
                  :stripe_max_sessions,
                  :stripe_postnl_metadata_processed_key

      attr_reader :postnl_env,
                  :postnl_api_key,
                  :postnl_customer_code,
                  :postnl_customer_number,
                  :postnl_collection_location,
                  :postnl_product_code_delivery,
                  :postnl_sender_name,
                  :postnl_sender_contact_person,
                  :postnl_sender_email,
                  :postnl_sender_company_name,
                  :postnl_sender_country_code,
                  :postnl_sender_city,
                  :postnl_sender_street,
                  :postnl_sender_house_nr,
                  :postnl_sender_zipcode,
                  :postnl_default_parcel_count_fallback,
                  :postnl_default_weight_grams,
                  :postnl_default_length_mm,
                  :postnl_default_width_mm,
                  :postnl_default_height_mm,
                  :postnl_contact_type,
                  :postnl_printer_type,
                  :postnl_output_label_file_ext,
                  :postnl_output_dir,
                  :dry_run

      def initialize
        @stripe_secret_key = ENV.fetch("STRIPE_SECRET_KEY")
        @stripe_page_size = integer_env("STRIPE_PAGE_SIZE", 25)
        @stripe_max_sessions = integer_env("STRIPE_MAX_SESSIONS", 50)
        @stripe_postnl_metadata_processed_key = ENV.fetch("STRIPE_POSTNL_METADATA_PROCESSED_KEY", "postnl_processed")

        @postnl_env = ENV.fetch("POSTNL_ENV", "sandbox")
        @postnl_api_key = ENV.fetch("POSTNL_API_KEY")

        @postnl_customer_code = ENV.fetch("POSTNL_CUSTOMER_CODE")
        @postnl_customer_number = ENV.fetch("POSTNL_CUSTOMER_NUMBER")
        @postnl_collection_location = ENV.fetch("POSTNL_COLLECTION_LOCATION")

        @postnl_product_code_delivery = ENV.fetch("POSTNL_PRODUCT_CODE_DELIVERY")

        @postnl_sender_name = ENV.fetch("POSTNL_SENDER_NAME")
        @postnl_sender_contact_person = ENV.fetch("POSTNL_SENDER_CONTACT_PERSON")
        @postnl_sender_email = ENV.fetch("POSTNL_SENDER_EMAIL")
        @postnl_sender_company_name = ENV["POSTNL_SENDER_COMPANY_NAME"]

        @postnl_sender_country_code = ENV.fetch("POSTNL_SENDER_COUNTRY_CODE")
        @postnl_sender_city = ENV.fetch("POSTNL_SENDER_CITY")
        @postnl_sender_street = ENV.fetch("POSTNL_SENDER_STREET")
        @postnl_sender_house_nr = ENV.fetch("POSTNL_SENDER_HOUSE_NR")
        @postnl_sender_zipcode = ENV.fetch("POSTNL_SENDER_ZIPCODE")

        @postnl_default_parcel_count_fallback = integer_env("POSTNL_DEFAULT_PARCEL_COUNT_FALLBACK", 1)
        @postnl_default_weight_grams = integer_env("POSTNL_DEFAULT_WEIGHT_GRAMS", 500)
        @postnl_default_length_mm = integer_env("POSTNL_DEFAULT_LENGTH_MM", 300)
        @postnl_default_width_mm = integer_env("POSTNL_DEFAULT_WIDTH_MM", 200)
        @postnl_default_height_mm = integer_env("POSTNL_DEFAULT_HEIGHT_MM", 50)

        @postnl_contact_type = ENV.fetch("POSTNL_CONTACT_TYPE", "01")
        @postnl_printer_type = ENV.fetch("POSTNL_PRINTER_TYPE", "GraphicFile|PDF")

        @postnl_output_label_file_ext = ENV.fetch("POSTNL_OUTPUT_LABEL_FILE_EXT", "pdf")
        @postnl_output_dir = ENV.fetch("POSTNL_OUTPUT_DIR", "output")

        @dry_run = (ENV.fetch("DRY_RUN", "false").downcase == "true")

        validate!
      end

      def postnl_base_url
        case postnl_env
        when "sandbox"
          "https://api-sandbox.postnl.nl"
        when "production"
          "https://api.postnl.nl"
        else
          raise "Invalid POSTNL_ENV=#{postnl_env.inspect}. Use 'sandbox' or 'production'."
        end
      end

      private

      def validate!
        raise "POSTNL_API_KEY is required" if @postnl_api_key.to_s.strip.empty?

        required = [
          @postnl_customer_code,
          @postnl_customer_number,
          @postnl_collection_location,
          @postnl_sender_country_code,
          @postnl_sender_city,
          @postnl_sender_street,
          @postnl_sender_house_nr,
          @postnl_sender_zipcode,
          @postnl_product_code_delivery
        ]
        if required.any? { |v| v.nil? || v.to_s.strip.empty? }
          raise "One or more required PostNL sender/contract env vars are missing."
        end

        unless postnl_contact_type.to_s.match?(/^\d{2}$/)
          warn "POSTNL_CONTACT_TYPE should be a 2-digit code (got #{postnl_contact_type.inspect})"
        end
      end

      def integer_env(name, default)
        val = ENV[name]
        return default if val.nil? || val.to_s.strip.empty?

        Integer(val)
      rescue ArgumentError
        raise "Invalid integer env var #{name}=#{val.inspect}"
      end
    end
  end
end

