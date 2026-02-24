<?php
/**
 * Plugin Name: Programmatic SEO Engine
 * Description: Renders millions of programmatic SEO landing pages from JSON data files.
 * Version: 1.0.0
 * Author: John Williams
 * Author URI: https://itallstartedwithaidea.com
 * License: MIT
 */

if (!defined('ABSPATH')) exit;

class Programmatic_SEO_Engine {
    private $cities = [];
    private $services = [];
    private $categories = [];

    public function __construct() {
        add_action('init', [$this, 'register_rewrite_rules']);
        add_action('template_redirect', [$this, 'handle_request']);
        add_filter('query_vars', [$this, 'add_query_vars']);
        add_action('admin_menu', [$this, 'admin_menu']);
    }

    public function register_rewrite_rules() {
        add_rewrite_rule(
            '^services/([^/]+)/([^/]+)/?$',
            'index.php?pseo_type=service&pseo_city=$matches[1]&pseo_service=$matches[2]',
            'top'
        );
        add_rewrite_rule(
            '^ecommerce/([^/]+)/([^/]+)/?$',
            'index.php?pseo_type=ecommerce&pseo_city=$matches[1]&pseo_industry=$matches[2]',
            'top'
        );
    }

    public function add_query_vars($vars) {
        $vars[] = 'pseo_type';
        $vars[] = 'pseo_city';
        $vars[] = 'pseo_service';
        $vars[] = 'pseo_industry';
        return $vars;
    }

    public function handle_request() {
        $type = get_query_var('pseo_type');
        if (!$type) return;

        $this->load_data();

        if ($type === 'service') {
            $this->render_service_page();
        } elseif ($type === 'ecommerce') {
            $this->render_ecommerce_page();
        }
    }

    private function load_data() {
        $data_dir = plugin_dir_path(__FILE__) . 'data/';

        $cities_file = $data_dir . 'cities.json';
        if (file_exists($cities_file)) {
            $cities_raw = json_decode(file_get_contents($cities_file), true);
            foreach ($cities_raw as $c) {
                $this->cities[$c['slug']] = $c;
            }
        }

        $services_file = $data_dir . 'services.json';
        if (file_exists($services_file)) {
            $services_raw = json_decode(file_get_contents($services_file), true);
            foreach ($services_raw['services'] as $s) {
                $this->services[$s['slug']] = $s;
            }
            $this->categories = $services_raw['categories'];
        }
    }

    private function render_service_page() {
        $city_slug = get_query_var('pseo_city');
        $service_slug = get_query_var('pseo_service');

        if (!isset($this->cities[$city_slug]) || !isset($this->services[$service_slug])) {
            status_header(404);
            nocache_headers();
            include get_404_template();
            exit;
        }

        $city = $this->cities[$city_slug];
        $service = $this->services[$service_slug];
        $category = $this->categories[$service['category']] ?? null;

        if ($service['stateRestriction'] && !in_array($city['state'], $service['stateRestriction'])) {
            status_header(404);
            include get_404_template();
            exit;
        }

        $is_top_metro = ($city['population'] ?? 0) >= 250000;
        if (!$is_top_metro) {
            header('X-Robots-Tag: noindex, follow');
        }

        status_header(200);
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: public, max-age=86400, s-maxage=604800');

        $template_file = plugin_dir_path(__FILE__) . 'templates/service-page.html';
        if (!file_exists($template_file)) {
            wp_die('Template not found. Copy templates/ from the programmatic-seo-engine repo.');
        }

        $html = file_get_contents($template_file);

        $service_lower = strtolower(preg_replace('/\s+services?$/i', '', $service['name']));

        $replacements = [
            '{{BRAND_NAME}}' => get_bloginfo('name'),
            '{{DOMAIN}}' => home_url(),
            '{{SERVICE_NAME}}' => esc_html($service['name']),
            '{{SERVICE_NAME_LOWER}}' => esc_html($service_lower),
            '{{SERVICE_SLUG}}' => esc_attr($service['slug']),
            '{{CITY_NAME}}' => esc_html($city['name']),
            '{{CITY_SLUG}}' => esc_attr($city_slug),
            '{{STATE_ABBR}}' => esc_html($city['state']),
            '{{ROBOTS_DIRECTIVE}}' => $is_top_metro ? 'index, follow' : 'noindex, follow',
            '{{CATEGORY_LABEL}}' => esc_html($category['label'] ?? ''),
            '{{CATEGORY_COLOR}}' => esc_attr($category['color'] ?? '#f0a830'),
            '{{PAIN_WASTED_SPEND}}' => esc_html($category['defaultPains']['wasted_spend'] ?? ''),
            '{{PAIN_NEGATIVES}}' => esc_html($category['defaultPains']['negatives'] ?? ''),
            '{{PAIN_GEO}}' => esc_html($category['defaultPains']['geo'] ?? ''),
            '{{PAIN_TRACKING}}' => esc_html($category['defaultPains']['tracking'] ?? ''),
            '{{PAIN_SCHEDULING}}' => esc_html($category['defaultPains']['scheduling'] ?? ''),
            '{{PAIN_BIDDING}}' => esc_html($category['defaultPains']['bidding'] ?? ''),
            '{{OG_IMAGE}}' => '',
            '{{GTM_HEAD}}' => '',
            '{{GTM_BODY}}' => '',
            '{{FORM_KEY}}' => get_option('pseo_web3forms_key', ''),
            '{{AUTHOR_NAME}}' => get_option('pseo_author_name', ''),
            '{{AUTHOR_TITLE}}' => get_option('pseo_author_title', ''),
            '{{AUTHOR_COMPANY}}' => get_option('pseo_author_company', ''),
            '{{AUTHOR_COMPANY_URL}}' => get_option('pseo_author_company_url', ''),
            '{{AUTHOR_CREDENTIALS}}' => get_option('pseo_author_credentials', ''),
        ];

        foreach ($replacements as $key => $value) {
            $html = str_replace($key, $value, $html);
        }

        echo $html;
        exit;
    }

    private function render_ecommerce_page() {
        $city_slug = get_query_var('pseo_city');
        $industry_slug = get_query_var('pseo_industry');

        if (!isset($this->cities[$city_slug])) {
            status_header(404);
            include get_404_template();
            exit;
        }

        status_header(200);
        header('Content-Type: text/html; charset=utf-8');

        echo '<!DOCTYPE html><html><body><h1>Ecommerce page: ' . esc_html($industry_slug) . ' in ' . esc_html($this->cities[$city_slug]['name']) . '</h1></body></html>';
        exit;
    }

    public function admin_menu() {
        add_options_page(
            'Programmatic SEO',
            'Programmatic SEO',
            'manage_options',
            'programmatic-seo',
            [$this, 'settings_page']
        );
    }

    public function settings_page() {
        if (isset($_POST['pseo_save']) && check_admin_referer('pseo_settings')) {
            update_option('pseo_web3forms_key', sanitize_text_field($_POST['pseo_web3forms_key'] ?? ''));
            update_option('pseo_author_name', sanitize_text_field($_POST['pseo_author_name'] ?? ''));
            update_option('pseo_author_title', sanitize_text_field($_POST['pseo_author_title'] ?? ''));
            update_option('pseo_author_company', sanitize_text_field($_POST['pseo_author_company'] ?? ''));
            update_option('pseo_author_credentials', sanitize_text_field($_POST['pseo_author_credentials'] ?? ''));
            echo '<div class="updated"><p>Settings saved.</p></div>';
        }

        $key = get_option('pseo_web3forms_key', '');
        $name = get_option('pseo_author_name', '');
        $title = get_option('pseo_author_title', '');
        $company = get_option('pseo_author_company', '');
        $creds = get_option('pseo_author_credentials', '');
        ?>
        <div class="wrap">
            <h1>Programmatic SEO Engine</h1>
            <p>Cities loaded: <strong><?php echo count($this->cities); ?></strong> |
               Services loaded: <strong><?php echo count($this->services); ?></strong></p>
            <form method="post">
                <?php wp_nonce_field('pseo_settings'); ?>
                <table class="form-table">
                    <tr><th>Web3Forms Key</th><td><input type="text" name="pseo_web3forms_key" value="<?php echo esc_attr($key); ?>" class="regular-text"></td></tr>
                    <tr><th>Author Name</th><td><input type="text" name="pseo_author_name" value="<?php echo esc_attr($name); ?>" class="regular-text"></td></tr>
                    <tr><th>Author Title</th><td><input type="text" name="pseo_author_title" value="<?php echo esc_attr($title); ?>" class="regular-text"></td></tr>
                    <tr><th>Company</th><td><input type="text" name="pseo_author_company" value="<?php echo esc_attr($company); ?>" class="regular-text"></td></tr>
                    <tr><th>Credentials</th><td><textarea name="pseo_author_credentials" class="large-text" rows="3"><?php echo esc_textarea($creds); ?></textarea></td></tr>
                </table>
                <p class="submit"><input type="submit" name="pseo_save" class="button-primary" value="Save Settings"></p>
            </form>
            <hr>
            <h2>Flush Rewrite Rules</h2>
            <p>After activating, go to <strong>Settings → Permalinks</strong> and click "Save Changes" to flush rewrite rules.</p>
        </div>
        <?php
    }
}

new Programmatic_SEO_Engine();
