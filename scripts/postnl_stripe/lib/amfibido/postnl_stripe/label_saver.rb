require "base64"
require "fileutils"

module Amfibido
  module PostnlStripe
    class LabelSaver
      def initialize(env:)
        @env = env
      end

      # Saves PostNL label(s) returned from the shipment label endpoint.
      # Returns an array of hashes: [{barcode:, filename:}, ...] aligned with shipments order.
      def save_labels!(response_json:, session_id:)
        output_dir = @env.postnl_output_dir
        FileUtils.mkdir_p(output_dir)

        # The PostNL response uses PascalCase keys, based on the official SDK examples.
        shipments = response_json["ResponseShipments"] || response_json["responseShipments"] || []
        raise "PostNL response missing ResponseShipments" if shipments.empty?

        barcodes_and_files = shipments.each_with_index.map do |shipment, idx|
          barcode = shipment["Barcode"].to_s.strip
          labels = shipment["Labels"] || []

          label = labels.find { |l| l["OutputType"].to_s.casecmp?("pdf") } || labels.first
          content = label && label["Content"]
          raise "PostNL response missing label Content (shipment index #{idx})" if content.to_s.strip.empty?

          filename = build_filename(session_id: session_id, barcode: barcode, index: idx)
          save_label_file!(path: File.join(output_dir, filename), content: content)

          { barcode: barcode, filename: filename }
        end

        barcodes_and_files
      end

      private

      def build_filename(session_id:, barcode:, index:)
        ext = @env.postnl_output_label_file_ext.to_s.strip
        ext = "pdf" if ext.empty?

        safe_barcode = barcode.empty? ? "no-barcode-#{index + 1}" : barcode.gsub(/[^A-Za-z0-9\-_]/, "_")
        "label-#{session_id}-#{safe_barcode}.#{ext}"
      end

      def save_label_file!(path:, content:)
        bytes = begin
          Base64.decode64(content)
        rescue StandardError
          nil
        end

        File.binwrite(path, bytes && !bytes.empty? ? bytes : content)
      end
    end
  end
end

