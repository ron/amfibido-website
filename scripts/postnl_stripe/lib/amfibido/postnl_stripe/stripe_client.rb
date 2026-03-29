require "stripe"

module Amfibido
  module PostnlStripe
    class StripeClient
      def initialize(env:)
        @env = env
        Stripe.api_key = env.stripe_secret_key
      end

      # Returns Stripe checkout sessions that look like they are paid and not processed yet.
      def fetch_open_paid_sessions!(max_sessions:)
        sessions_processed = 0
        starting_after = nil

        loop do
          break if sessions_processed >= max_sessions

          params = {
            status: "complete",
            limit: @env.stripe_page_size
          }
          params[:starting_after] = starting_after if starting_after

          list = Stripe::Checkout::Session.list(params)
          break if list.data.empty?

          list.data.each do |s|
            break if sessions_processed >= max_sessions

            # Payment can still be in-flight even when status=complete; filter by payment_status.
            next unless s.payment_status == "paid"

            metadata = s.metadata || {}
            processed = metadata[@env.stripe_postnl_metadata_processed_key] == "true"
            next if processed

            # We need shipping details to create the PostNL shipment.
            next if s.shipping_details.nil? || s.shipping_details.address.nil?

            full = Stripe::Checkout::Session.retrieve(s.id, expand: ["line_items"])
            yield full
            sessions_processed += 1
          end

          starting_after = list.data.last&.id
          break if !list.respond_to?(:has_more) || !list.has_more
        end
      end

      def mark_session_processed!(session_id:, metadata:)
        # Preserve existing metadata keys by merging in our updates.
        session = Stripe::Checkout::Session.retrieve(session_id)
        existing = session.metadata || {}
        merged = existing.merge(metadata)

        Stripe::Checkout::Session.update(session_id, metadata: merged)
      end
    end
  end
end

