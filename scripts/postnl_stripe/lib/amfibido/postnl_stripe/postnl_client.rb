require "json"
require "net/http"
require "uri"

module Amfibido
  module PostnlStripe
    class PostnlClient
      def initialize(env:)
        @env = env
        @base_url = env.postnl_base_url
      end

      # Calls PostNL Shipment API to generate labels (and pre-announce shipments).
      # Returns parsed JSON response.
      def generate_shipment_labels!(payload:, confirm: true)
        uri = URI.parse("#{@base_url}/shipment/v2_2/label")
        uri.query = URI.encode_www_form({ "confirm" => confirm.to_s })

        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = (uri.scheme == "https")

        req = Net::HTTP::Post.new(uri.request_uri)
        req["Content-Type"] = "application/json"
        req["accept"] = "application/json"
        req["apikey"] = @env.postnl_api_key
        req.body = JSON.dump(payload)

        res = http.request(req)
        body = res.body.to_s

        unless res.is_a?(Net::HTTPSuccess)
          raise "PostNL request failed: HTTP #{res.code} #{res.message}: #{body}"
        end

        JSON.parse(body)
      end
    end
  end
end

