#!/usr/bin/env ruby

require "bundler/setup"
require "optparse"

script_dir = File.expand_path("..", __dir__)
Dir.chdir(script_dir)

require_relative "../lib/amfibido/postnl_stripe/env"
require_relative "../lib/amfibido/postnl_stripe/stripe_client"
require_relative "../lib/amfibido/postnl_stripe/postnl_client"
require_relative "../lib/amfibido/postnl_stripe/shipments_payload_builder"
require_relative "../lib/amfibido/postnl_stripe/label_saver"
require_relative "../lib/amfibido/postnl_stripe/open_shipments_processor"

options = {
  max_sessions: nil,
  dry_run: nil
}

OptionParser.new do |opts|
  opts.banner = "Usage: bin/process_open_shipments.rb [options]"

  opts.on("--max-sessions N", Integer, "Max number of Stripe checkout sessions to process") do |n|
    options[:max_sessions] = n
  end

  opts.on("--dry-run", "Don't call PostNL or update Stripe metadata") do
    options[:dry_run] = true
  end
end.parse!(ARGV)

env = Amfibido::PostnlStripe::Env.new

max_sessions = options[:max_sessions] || env.stripe_max_sessions
dry_run = options[:dry_run].nil? ? env.dry_run : options[:dry_run]

processor = Amfibido::PostnlStripe::OpenShipmentsProcessor.new(env: env)
summary = processor.process_open_paid_shipments!(max_sessions: max_sessions, dry_run: dry_run)

puts "\n=== Summary ==="
puts summary.inspect

