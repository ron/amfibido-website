require "time"

module Amfibido
  module PostnlStripe
    class OpenShipmentsProcessor
      def initialize(env:)
        @env = env
        @stripe_client = StripeClient.new(env: env)
        @postnl_client = PostnlClient.new(env: env)
        @payload_builder = ShipmentsPayloadBuilder.new(env: env)
        @label_saver = LabelSaver.new(env: env)
      end

      def process_open_paid_shipments!(max_sessions: @env.stripe_max_sessions, dry_run: @env.dry_run)
        processed = 0
        errored = 0

        @stripe_client.fetch_open_paid_sessions!(max_sessions: max_sessions) do |session|
          begin
            result = process_one_session!(session, dry_run: dry_run)
            processed += 1 if result[:processed]
          rescue StandardError => e
            errored += 1
            warn "Error processing Stripe session #{session.id}: #{e.message}"
            warn e.backtrace.take(8).join("\n")
          end
        end

        {
          processed_sessions: processed,
          errored_sessions: errored
        }
      end

      private

      def process_one_session!(session, dry_run:)
        metadata = session.metadata || {}
        return { processed: false, reason: "already processed" } if metadata[@env.stripe_postnl_metadata_processed_key] == "true"

        parcel_count = parcel_count_from_session(session)
        puts "Processing Stripe session #{session.id} (parcels: #{parcel_count})"

        payload = @payload_builder.build!(session: session)

        if dry_run
          puts "DRY_RUN=true: skipping PostNL call and Stripe metadata update for #{session.id}"
          return { processed: false, reason: "dry_run" }
        end

        response = @postnl_client.generate_shipment_labels!(payload: payload, confirm: true)
        saved = @label_saver.save_labels!(response_json: response, session_id: session.id)
        barcodes = saved.map { |x| x[:barcode] }
        label_files = saved.map { |x| x[:filename] }

        @stripe_client.mark_session_processed!(
          session_id: session.id,
          metadata: build_processed_metadata(session: session, barcodes: barcodes, label_files: label_files)
        )

        puts "  ✓ PostNL generated shipments for #{session.id}"
        { processed: true, barcodes: barcodes, label_files: label_files }
      end

      def parcel_count_from_session(session)
        line_items = session.line_items
        data = line_items.respond_to?(:data) ? line_items.data : []
        total = data.sum { |li| li.quantity.to_i }
        total.positive? ? total : @env.postnl_default_parcel_count_fallback
      end

      def build_processed_metadata(session:, barcodes:, label_files:)
        {
          @env.stripe_postnl_metadata_processed_key => "true",
          "postnl_processed_at" => Time.now.utc.iso8601,
          "postnl_shipment_count" => barcodes.size.to_s,
          "postnl_barcodes" => barcodes.join(","),
          "postnl_label_files" => label_files.join(",")
        }
      end
    end
  end
end

