module Amfibido
  module PostnlStripe
    class ShipmentsPayloadBuilder
      def initialize(env:)
        @env = env
      end

      def build!(session:)
        shipping = session.shipping_details
        raise "Missing shipping_details" if shipping.nil?
        address = shipping.address
        raise "Missing shipping_details.address" if address.nil?

        receiver_country = safe_country_code(address)
        receiver_city = safe_present(address.city)
        receiver_postal_code = safe_present(address.postal_code)
        receiver_line1 = safe_present(address.line1)
        receiver_line2 = address.line2.to_s.strip

        street, house_nr, house_nr_ext = parse_street_house_number(receiver_line1)
        if house_nr_ext.to_s.strip.empty? && !receiver_line2.empty?
          # Only treat line2 as house-number suffix when it looks like a suffix (e.g. "A", "bis").
          house_nr_ext = receiver_line2 if receiver_line2.match?(/\A[A-Za-z][A-Za-z0-9\-\/]*\z/)
        end

        receiver_first_name, receiver_last_name = split_name(session.customer_details&.name || shipping.name || "Customer")

        receiver_email = session.customer_details&.email.to_s.strip
        receiver_phone = session.customer_details&.phone.to_s.strip
        if receiver_email.empty? && receiver_phone.empty?
          raise "Receiver contact missing: need customer_details.email or customer_details.phone in Stripe."
        end

        parcel_count = total_parcels_from_line_items(session)

        message = {
          "MessageID" => message_id(session.id),
          "MessageTimeStamp" => timestamp_string(Time.now),
          "Printertype" => @env.postnl_printer_type
        }

        payload = {
          "Customer" => sender_customer_hash,
          "Message" => message,
          "Shipments" => Array.new(parcel_count) do |i|
            build_single_shipment(
              parcel_index: i,
              receiver: {
                "AddressType" => "01",
                "Countrycode" => receiver_country,
                "City" => receiver_city,
                "Zipcode" => receiver_postal_code,
                "Street" => street,
                "HouseNr" => house_nr,
                "HouseNrExt" => presence(house_nr_ext),
                "FirstName" => receiver_first_name,
                "Name" => receiver_last_name
              }.compact,
              receiver_email: receiver_email,
              receiver_phone: receiver_phone
            )
          end
        }

        payload
      end

      private

      def sender_customer_hash
        sender_address = {
          "AddressType" => "02",
          "Countrycode" => @env.postnl_sender_country_code,
          "City" => @env.postnl_sender_city,
          "Street" => @env.postnl_sender_street,
          "HouseNr" => @env.postnl_sender_house_nr,
          "Zipcode" => @env.postnl_sender_zipcode,
          "CompanyName" => @env.postnl_sender_company_name
        }.compact

        {
          "CustomerCode" => @env.postnl_customer_code,
          "CustomerNumber" => @env.postnl_customer_number,
          "CollectionLocation" => @env.postnl_collection_location,
          "ContactPerson" => @env.postnl_sender_contact_person,
          "Email" => @env.postnl_sender_email,
          "Name" => @env.postnl_sender_name,
          "Address" => sender_address
        }
      end

      def build_single_shipment(parcel_index:, receiver:, receiver_email:, receiver_phone:)
        weight = @env.postnl_default_weight_grams

        contacts = [
          {
            "ContactType" => @env.postnl_contact_type,
            "Email" => presence(receiver_email),
            "TelNr" => presence(receiver_phone)
          }.compact
        ]

        {
          "Addresses" => [receiver],
          "ProductCodeDelivery" => @env.postnl_product_code_delivery,
          "Contacts" => contacts,
          "Dimension" => {
            # PostNL expects Weight in grams; Length/Width/Height in mm.
            "Weight" => weight,
            "Length" => @env.postnl_default_length_mm,
            "Width" => @env.postnl_default_width_mm,
            "Height" => @env.postnl_default_height_mm
          },
          # Unique per parcel (used by you; PostNL can also generate its own barcode).
          "Reference" => "stripe-parcel-#{parcel_index + 1}"
        }
      end

      def total_parcels_from_line_items(session)
        line_items = session.line_items
        return @env.postnl_default_parcel_count_fallback if line_items.nil?

        # Stripe returns a list-like object with `.data`.
        data = line_items.respond_to?(:data) ? line_items.data : []
        total = data.sum do |li|
          q = li.respond_to?(:quantity) ? li.quantity : nil
          q.to_i
        end

        total.positive? ? total : @env.postnl_default_parcel_count_fallback
      end

      def split_name(full_name)
        tokens = full_name.to_s.strip.split(/\s+/)
        first = tokens.shift || "Customer"
        last = tokens.join(" ")
        last = first if last.to_s.strip.empty?
        [first, last]
      end

      def parse_street_house_number(line1)
        line1 = line1.to_s.strip
        # Common patterns:
        #  - "Main Street 12"
        #  - "Main Street 12A"
        #  - "Main Street 12 A"
        #  - "Main Street 12 bis" (we treat "bis" as house_nr_ext)
        #
        # This is intentionally conservative; if parsing fails we prefer raising
        # rather than sending a wrong label.
        if (m = line1.match(/\A(.+?)\s+(\d+)\s+([A-Za-z].+)\z/))
          street = m[1].strip
          house_nr = m[2].strip
          house_nr_ext = m[3].strip
          return [street, house_nr, house_nr_ext]
        end

        if (m = line1.match(/\A(.+?)\s+(\d+)([A-Za-z]{1,4})\z/))
          street = m[1].strip
          house_nr = m[2].strip
          house_nr_ext = m[3].strip
          return [street, house_nr, house_nr_ext]
        end

        if (m = line1.match(/\A(.+?)\s+(\d+)\z/))
          street = m[1].strip
          house_nr = m[2].strip
          return [street, house_nr, nil]
        end

        raise "Couldn't parse receiver address line1 into street + house number. Got: #{line1.inspect}"
      end

      def message_id(session_id)
        # PostNL constraints: min 1, max 12.
        session_id.to_s[0, 12] || "1"
      end

      def timestamp_string(time)
        time.strftime("%d-%m-%Y %H:%M:%S")
      end

      def safe_present(value)
        v = value.to_s.strip
        raise "Required value missing" if v.empty?
        v
      end

      def safe_country_code(address)
        cc = address.country.to_s.strip
        raise "Receiver country missing from Stripe shipping address (expected ISO2)" if cc.empty?
        cc
      end

      def presence(value)
        return nil if value.nil?
        s = value.is_a?(String) ? value.strip : value
        if s.respond_to?(:empty?) && s.empty?
          nil
        else
          s
        end
      end
    end
  end
end
